import { useEffect } from 'react';
import { getOptimizedImageUrl } from '../utils';

function setMetaTag(attr: 'name' | 'property', value: string, content: string) {
  let element = document.querySelector(`meta[${attr}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    (element as HTMLLinkElement).rel = rel;
    document.head.appendChild(element);
  }
  (element as HTMLLinkElement).href = href;
}

const defaultTitle = 'clazz.lk - Online Learning Platform for Sri Lanka';
const defaultDescription = 'Connect with the best tutors, enroll in online classes, and excel in your studies.';
const defaultImage = '/Logo3.png';

export const useSEO = (
  title: string = defaultTitle,
  description: string = defaultDescription,
  imageUrl: string = defaultImage
) => {
  useEffect(() => {
    document.title = title;

    const url = window.location.href;
    const absoluteImageUrl = new URL(imageUrl, window.location.origin).href;

    // Standard meta tags
    setMetaTag('name', 'description', description.substring(0, 160));
    setLinkTag('canonical', url);


    // Open Graph / Facebook
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description.substring(0, 300));
    setMetaTag('property', 'og:url', url);
    // Use optimized URL for meta tags to avoid token issues and ensure public access
    const optimizedImageUrl = getOptimizedImageUrl(absoluteImageUrl, 1200); // 1200 is standard FB size
    setMetaTag('property', 'og:image', optimizedImageUrl);

    // Twitter
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description.substring(0, 200));
    setMetaTag('name', 'twitter:image', absoluteImageUrl);

    // Cleanup function to reset to defaults when component unmounts
    return () => {
      document.title = defaultTitle;
      setMetaTag('name', 'description', defaultDescription);
      // Add other resets if necessary for your app's logic
    };
  }, [title, description, imageUrl]);
};