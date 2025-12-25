import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    structuredData?: any;
}

const SEOHead: React.FC<SEOHeadProps> = ({
    title = "Clazz.lk | Find the Best Tuition Classes in Sri Lanka",
    description = "Connect with top teachers, join online classes, take quizzes, and buy educational resources. The ultimate platform for students and teachers in Sri Lanka.",
    image = "/Logo3.png",
    url = "https://clazz.lk/",
    type = "website",
    structuredData
}) => {
    const fullTitle = title.includes("Clazz.lk") ? title : `${title} | Clazz.lk`;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Structured Data (JSON-LD) */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
};

export default SEOHead;
