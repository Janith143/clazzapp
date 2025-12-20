
import React, { useState, useMemo } from 'react';
import { TeachingLocation, InstituteType } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { sriLankanDistricts, sriLankanTownsByDistrict, instituteTypes } from '../../data/mockData';
import SearchableSelect from '../SearchableSelect';
import FormSelect from '../FormSelect';
import { PlusIcon, TrashIcon, MapPinIcon } from '../Icons';
import { v4 as uuidv4 } from 'uuid';

interface TeachingLocationsEditorProps {
    locations: TeachingLocation[];
    onChange: (locations: TeachingLocation[]) => void;
}

const TeachingLocationsEditor: React.FC<TeachingLocationsEditorProps> = ({ locations, onChange }) => {
    const { tuitionInstitutes, knownInstitutes } = useData();
    const { addToast } = useUI();

    const [locDistrict, setLocDistrict] = useState('');
    const [locTown, setLocTown] = useState('');
    const [locInstitute, setLocInstitute] = useState('');
    const [locType, setLocType] = useState<InstituteType | ''>('');

    const townOptions = useMemo(() => {
        if (!locDistrict) return [];
        const towns = sriLankanTownsByDistrict[locDistrict] || [];
        return [{ value: '', label: 'Select a town' }, ...towns.map(t => ({ value: t, label: t }))];
    }, [locDistrict]);

    const instituteSuggestions = useMemo(() => {
        if (!locDistrict || !locTown) return [];

        const registered = tuitionInstitutes.map(ti => ({ name: ti.name, type: 'Tuition Institute' as InstituteType }));
        const known = knownInstitutes
            .filter(ki => ki.district === locDistrict && ki.town === locTown)
            .map(ki => ({ name: ki.name, type: ki.type }));
        
        const combined = new Map<string, { name: string, type: InstituteType }>();
        registered.forEach(i => combined.set(i.name, i));
        known.forEach(i => combined.set(i.name, i));

        return Array.from(combined.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [tuitionInstitutes, knownInstitutes, locDistrict, locTown]);

    const handleInstituteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocInstitute(val);
        const match = instituteSuggestions.find(i => i.name.toLowerCase() === val.toLowerCase());
        if (match) {
            setLocType(match.type);
        }
    };

    const handleAddLocation = () => {
        if (!locDistrict || !locTown || !locInstitute || !locType) {
            addToast("Please fill in all location fields.", "error");
            return;
        }
        const newLocation: TeachingLocation = {
            id: uuidv4(),
            district: locDistrict,
            town: locTown,
            instituteName: locInstitute,
            instituteType: locType
        };
        
        onChange([...locations, newLocation]);
        setLocInstitute('');
        setLocType('');
    };

    const handleRemoveLocation = (id: string) => {
        onChange(locations.filter(loc => loc.id !== id));
    };

    return (
        <div className="space-y-6">
             <h2 className="text-xl font-semibold border-b border-light-border dark:border-dark-border pb-2 text-light-text dark:text-dark-text flex items-center">
                 <MapPinIcon className="w-5 h-5 mr-2 text-primary"/>
                 Teaching Locations
            </h2>

            <div className="p-4 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <SearchableSelect
                        label="District"
                        options={sriLankanDistricts.map(d => ({ value: d, label: d }))}
                        value={locDistrict}
                        onChange={(val) => { setLocDistrict(val); setLocTown(''); }}
                        placeholder="Select District"
                    />
                     <SearchableSelect
                        label="Town"
                        options={townOptions}
                        value={locTown}
                        onChange={setLocTown}
                        placeholder="Select Town"
                        disabled={!locDistrict}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">Institute Name</label>
                        <input 
                            type="text" 
                            list="editor-institute-suggestions" 
                            value={locInstitute} 
                            onChange={handleInstituteChange} 
                            placeholder="Type or select..."
                            className="w-full px-3 py-2 border border-light-border dark:border-dark-border bg-light-background dark:bg-dark-background rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-light-text dark:text-dark-text"
                            disabled={!locDistrict || !locTown}
                        />
                        <datalist id="editor-institute-suggestions">
                            {instituteSuggestions.map((item, i) => <option key={i} value={item.name} />)}
                        </datalist>
                        {(!locDistrict || !locTown) && <p className="text-xs text-light-subtle dark:text-dark-subtle mt-1">Select District and Town first.</p>}
                    </div>
                     <FormSelect 
                        label="Type" 
                        name="locType" 
                        value={locType} 
                        onChange={(e) => setLocType(e.target.value as InstituteType)} 
                        options={instituteTypes.map(t => ({ value: t, label: t }))} 
                    />
                </div>
                
                <button type="button" onClick={handleAddLocation} className="mt-2 flex items-center justify-center w-full py-2 px-4 border border-dashed border-primary text-primary rounded-md hover:bg-primary/10 transition-colors font-medium">
                    <PlusIcon className="w-4 h-4 mr-2" /> Add Location
                </button>
            </div>

            {locations.length > 0 && (
                <div className="space-y-2">
                {locations.map(loc => (
                    <div key={loc.id} className="flex justify-between items-center p-3 bg-light-background dark:bg-dark-background rounded-md border border-light-border dark:border-dark-border">
                        <div>
                            <p className="font-semibold text-sm text-light-text dark:text-dark-text">{loc.instituteName}</p>
                            <p className="text-xs text-light-subtle dark:text-dark-subtle">{loc.instituteType} • {loc.town}, {loc.district}</p>
                        </div>
                        <button type="button" onClick={() => handleRemoveLocation(loc.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 p-1.5 rounded-full">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                </div>
            )}
        </div>
    );
};

export default TeachingLocationsEditor;
