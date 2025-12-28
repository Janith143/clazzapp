import React from 'react';
import { Teacher } from '../types';
import { LogoIcon, PhoneIcon, MailIcon } from './Icons';
import { getOptimizedImageUrl } from '../utils';
import QRCodeWithLogo from './QRCodeWithLogo';

interface BusinessCardProps {
  teacher: Teacher;
}

const BusinessCard = React.forwardRef<HTMLDivElement, BusinessCardProps>(({ teacher }, ref) => {
  const profileUrl = teacher.username ? `${window.location.origin}/teacher/${teacher.username}` : `${window.location.origin}/?teacherId=${teacher.id}`;

  // Dynamic font scaling based on content length
  const nameFontSize =
    teacher.name.length > 25 ? '22px' : teacher.name.length > 18 ? '26px' : '28px';
  const taglineFontSize =
    teacher.tagline && teacher.tagline.length > 50
      ? '13px'
      : teacher.tagline && teacher.tagline.length > 30
        ? '14px'
        : '15px';

  const smallTextSize =
    (teacher.subjects?.join(', ').length || 0) > 80 ||
      (teacher.qualifications?.join(', ').length || 0) > 80
      ? '11px'
      : '13px';

  return (
    <div
      ref={ref}
      style={{
        width: '504px',
        height: '288px',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Accent diagonal bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '180px',
          height: '100%',
          background: 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 100%)',
          clipPath: 'polygon(0 0, 100% 0, 70% 100%, 0% 100%)',
          zIndex: 0,
        }}
      ></div>

      {/* LEFT PROFILE AREA */}
      <div
        style={{
          width: '180px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 12px',
          color: 'white',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Profile Image */}
        {teacher.profileImage ? (
          <img
            src={getOptimizedImageUrl(teacher.profileImage, 128, 128)}
            alt={teacher.name}
            crossOrigin="anonymous"
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
            }}
          />
        ) : (
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'white',
              border: '3px solid rgba(255,255,255,0.6)',
            }}
          >
            {teacher.name?.split(' ')[0]?.charAt(0) || ''}
            {teacher.name?.split(' ')[1]?.charAt(0) || ''}
          </div>
        )}

        {/* QR Code */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '6px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
            width: '100px',
            height: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <QRCodeWithLogo
            data={profileUrl}
            logoSrc="/Logo3.png"
            size={88}
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* RIGHT INFORMATION AREA */}
      <div
        style={{
          flex: 1,
          padding: '20px 26px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
          color: '#0f172a',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <LogoIcon style={{ height: '22px', width: '22px', color: '#2563eb' }} />
          <span
            style={{
              fontSize: '17px',
              fontWeight: 700,
              marginLeft: '6px',
              color: '#1e293b',
            }}
          >
            clazz.<span style={{ color: '#2563eb' }}>lk</span>
          </span>
        </div>

        {/* Teacher Name & Tagline */}
        <div style={{ marginTop: '12px' }}>
          <h2
            style={{
              fontSize: nameFontSize,
              fontWeight: 800,
              lineHeight: 1.2,
              margin: 0,
              color: '#0f172a',
              textTransform: 'capitalize',
              letterSpacing: '-0.5px',
            }}
          >
            {teacher.name}
          </h2>
          <p
            style={{
              fontSize: taglineFontSize,
              color: '#2563eb',
              margin: '2px 0 0 0',
              fontWeight: 500,
              letterSpacing: '0.2px',
            }}
          >
            {teacher.tagline}
          </p>
        </div>

        {/* Subjects & Qualifications */}
        <div
          style={{
            marginTop: '10px',
            fontSize: smallTextSize,
            lineHeight: 1.5,
            color: '#475569',
            maxHeight: '70px',
            overflow: 'hidden',
          }}
        >
          {teacher.subjects?.length > 0 && (
            <p style={{ margin: '0 0 4px 0' }}>
              <strong style={{ color: '#0f172a' }}>Subjects:</strong>{' '}
              {teacher.subjects.join(' • ')}
            </p>
          )}
          {teacher.qualifications?.length > 0 && (
            <p style={{ margin: 0 }}>
              <strong style={{ color: '#0f172a' }}>Qualifications:</strong>{' '}
              {teacher.qualifications.join(' • ')}
            </p>
          )}
        </div>

        {/* Contact Section */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '10px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PhoneIcon style={{ width: '13px', height: '13px', color: '#64748b' }} />
            <span style={{ fontSize: '12px', marginLeft: '6px', color: '#475569' }}>
              {teacher.contact.phone}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MailIcon style={{ width: '13px', height: '13px', color: '#64748b' }} />
            <span style={{ fontSize: '12px', marginLeft: '6px', color: '#475569' }}>
              {teacher.contact.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

BusinessCard.displayName = 'BusinessCard';
export default BusinessCard;