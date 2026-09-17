import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function RootDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isRtl = i18n.language === 'ku';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
}
