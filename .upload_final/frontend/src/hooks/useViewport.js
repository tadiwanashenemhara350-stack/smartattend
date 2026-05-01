import { useEffect, useState } from 'react';

const getWidth = () => (typeof window === 'undefined' ? 1280 : window.innerWidth);

export default function useViewport() {
  const [width, setWidth] = useState(getWidth);

  useEffect(() => {
    const handleResize = () => setWidth(getWidth());

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    width,
    isMobile: width < 768,
    isTablet: width < 1024,
  };
}
