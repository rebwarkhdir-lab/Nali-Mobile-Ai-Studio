import { ScreenProtectorGroup } from '../types/screenProtector';

export const INITIAL_SCREEN_PROTECTORS: ScreenProtectorGroup[] = [
  // ==========================================
  // APPLE IPHONE GROUPS
  // ==========================================
  {
    id: 'sp_ip_13_14_61',
    dieCode: 'IP 13/14 (6.1)',
    name: 'iPhone 13 / 13 Pro / 14 (6.1")',
    screenSize: '6.1 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 1',
    notes: 'Exact same screen size and narrower speaker cutout. 100% universal fit.',
    models: [
      { brand: 'Apple', model: 'iPhone 13', screenSize: '6.1"', releaseYear: 2021, isPopular: true },
      { brand: 'Apple', model: 'iPhone 13 Pro', screenSize: '6.1"', releaseYear: 2021, isPopular: true },
      { brand: 'Apple', model: 'iPhone 14', screenSize: '6.1"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_15_15pro_61',
    dieCode: 'IP 15/15P (6.1 DI)',
    name: 'iPhone 15 / 15 Pro (6.1" Dynamic Island)',
    screenSize: '6.1 inches',
    notchType: 'dynamic_island',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 2',
    notes: 'Dynamic island cut, slight 2.5D curved bezel.',
    models: [
      { brand: 'Apple', model: 'iPhone 15', screenSize: '6.1"', releaseYear: 2023, isPopular: true },
      { brand: 'Apple', model: 'iPhone 15 Pro', screenSize: '6.1"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_15plus_15promax_67',
    dieCode: 'IP 15+/15PM (6.7 DI)',
    name: 'iPhone 15 Plus / 15 Pro Max (6.7" Dynamic Island)',
    screenSize: '6.7 inches',
    notchType: 'dynamic_island',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 3',
    notes: 'Dynamic island cutout 6.7 inches.',
    models: [
      { brand: 'Apple', model: 'iPhone 15 Plus', screenSize: '6.7"', releaseYear: 2023, isPopular: true },
      { brand: 'Apple', model: 'iPhone 15 Pro Max', screenSize: '6.7"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_16_16pro',
    dieCode: 'IP 16 Series',
    name: 'iPhone 16 / 16 Pro',
    screenSize: '6.1" - 6.3"',
    notchType: 'dynamic_island',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 4',
    notes: 'Slim bezel borderless cut.',
    models: [
      { brand: 'Apple', model: 'iPhone 16', screenSize: '6.1"', releaseYear: 2024, isPopular: true },
      { brand: 'Apple', model: 'iPhone 16 Pro', screenSize: '6.3"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_14plus_13promax_67',
    dieCode: 'IP 13PM/14+ (6.7)',
    name: 'iPhone 13 Pro Max / 14 Plus (6.7")',
    screenSize: '6.7 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 5',
    notes: 'Standard 6.7" notch cutout, exact same die.',
    models: [
      { brand: 'Apple', model: 'iPhone 13 Pro Max', screenSize: '6.7"', releaseYear: 2021, isPopular: true },
      { brand: 'Apple', model: 'iPhone 14 Plus', screenSize: '6.7"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_14pro_14promax',
    dieCode: 'IP 14 Pro / 14 Pro Max',
    name: 'iPhone 14 Pro / 14 Pro Max (Dynamic Island)',
    screenSize: '6.1" & 6.7"',
    notchType: 'dynamic_island',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 6',
    notes: 'First generation dynamic island cutouts.',
    models: [
      { brand: 'Apple', model: 'iPhone 14 Pro', screenSize: '6.1"', releaseYear: 2022, isPopular: true },
      { brand: 'Apple', model: 'iPhone 14 Pro Max', screenSize: '6.7"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_12_12pro_61',
    dieCode: 'IP 12/12P (6.1)',
    name: 'iPhone 12 / 12 Pro (6.1")',
    screenSize: '6.1 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 7',
    notes: 'Flat square edge 6.1" glass, speaker in notch center.',
    models: [
      { brand: 'Apple', model: 'iPhone 12', screenSize: '6.1"', releaseYear: 2020, isPopular: true },
      { brand: 'Apple', model: 'iPhone 12 Pro', screenSize: '6.1"', releaseYear: 2020, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_11_xr_61',
    dieCode: 'IP 11/XR (6.1)',
    name: 'iPhone 11 / XR (6.1")',
    screenSize: '6.1 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 8',
    notes: '100% universal shared glass across iPhone 11 and iPhone XR.',
    models: [
      { brand: 'Apple', model: 'iPhone 11', screenSize: '6.1"', releaseYear: 2019, isPopular: true },
      { brand: 'Apple', model: 'iPhone XR', screenSize: '6.1"', releaseYear: 2018, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_x_xs_11pro_58',
    dieCode: 'IP X/XS/11P (5.8)',
    name: 'iPhone X / XS / 11 Pro (5.8")',
    screenSize: '5.8 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 9',
    notes: '100% identical 5.8 inch OLED notch glass.',
    models: [
      { brand: 'Apple', model: 'iPhone X', screenSize: '5.8"', releaseYear: 2017, isPopular: true },
      { brand: 'Apple', model: 'iPhone XS', screenSize: '5.8"', releaseYear: 2018, isPopular: true },
      { brand: 'Apple', model: 'iPhone 11 Pro', screenSize: '5.8"', releaseYear: 2019, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_xsmax_11promax_65',
    dieCode: 'IP XSMax/11PM (6.5)',
    name: 'iPhone XS Max / 11 Pro Max (6.5")',
    screenSize: '6.5 inches',
    notchType: 'wide_notch',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 10',
    notes: '100% identical 6.5 inch OLED notch glass.',
    models: [
      { brand: 'Apple', model: 'iPhone XS Max', screenSize: '6.5"', releaseYear: 2018, isPopular: true },
      { brand: 'Apple', model: 'iPhone 11 Pro Max', screenSize: '6.5"', releaseYear: 2019, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_7_8_se_47',
    dieCode: 'IP 7/8/SE (4.7)',
    name: 'iPhone 7 / 8 / SE 2020 / SE 2022 (4.7")',
    screenSize: '4.7 inches',
    notchType: 'flat_full',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 11',
    notes: 'Classic home button cutout 4.7 inches. Fits 7, 8, SE2, SE3.',
    models: [
      { brand: 'Apple', model: 'iPhone 7', screenSize: '4.7"', releaseYear: 2016 },
      { brand: 'Apple', model: 'iPhone 8', screenSize: '4.7"', releaseYear: 2017 },
      { brand: 'Apple', model: 'iPhone SE (2020)', aliases: ['iPhone SE 2'], screenSize: '4.7"', releaseYear: 2020, isPopular: true },
      { brand: 'Apple', model: 'iPhone SE (2022)', aliases: ['iPhone SE 3'], screenSize: '4.7"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_ip_7p_8p_55',
    dieCode: 'IP 7+/8+ (5.5)',
    name: 'iPhone 7 Plus / 8 Plus (5.5")',
    screenSize: '5.5 inches',
    notchType: 'flat_full',
    primaryBrand: 'Apple',
    shelfLocation: 'Shelf A - Box 12',
    notes: 'Classic 5.5" Plus size home button glass.',
    models: [
      { brand: 'Apple', model: 'iPhone 7 Plus', screenSize: '5.5"', releaseYear: 2016 },
      { brand: 'Apple', model: 'iPhone 8 Plus', screenSize: '5.5"', releaseYear: 2017 }
    ]
  },

  // ==========================================
  // SAMSUNG GALAXY GROUPS
  // ==========================================
  {
    id: 'sp_sam_a12_a02s_a03s_65',
    dieCode: 'SAM A12 / A03s / M12 (6.5)',
    name: 'Samsung Galaxy A12 / A02 / A02s / A03 / A03s / A04s / M12 / M02 / F12',
    screenSize: '6.5 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 1',
    notes: 'The most universal Samsung group in repair shops. Fits over 10 models perfectly.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A12', aliases: ['A125F', 'A127F', 'A12 Nacho'], screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A02', aliases: ['A022F'], screenSize: '6.5"', releaseYear: 2021 },
      { brand: 'Samsung', model: 'Galaxy A02s', aliases: ['A025F'], screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A03', aliases: ['A035F'], screenSize: '6.5"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A03s', aliases: ['A037F'], screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A04', aliases: ['A045F'], screenSize: '6.5"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A04s', aliases: ['A047F'], screenSize: '6.5"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A04e', aliases: ['A042F'], screenSize: '6.5"', releaseYear: 2022 },
      { brand: 'Samsung', model: 'Galaxy M12', aliases: ['M127F'], screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy M02', aliases: ['M022F'], screenSize: '6.5"', releaseYear: 2021 },
      { brand: 'Samsung', model: 'Galaxy M02s', aliases: ['M025F'], screenSize: '6.5"', releaseYear: 2021 },
      { brand: 'Samsung', model: 'Galaxy F12', aliases: ['F127G'], screenSize: '6.5"', releaseYear: 2021 }
    ]
  },
  {
    id: 'sp_sam_a13_a14_a15_66',
    dieCode: 'SAM A14/A15/A24 (6.6)',
    name: 'Samsung Galaxy A13 / A14 / A15 / A24 / A25 5G',
    screenSize: '6.5" - 6.6"',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 2',
    notes: 'Infinity-V / Infinity-U flat screen protector 6.5"-6.6".',
    models: [
      { brand: 'Samsung', model: 'Galaxy A13 4G', aliases: ['A135F'], screenSize: '6.6"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A13 5G', aliases: ['A136B'], screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A14 4G', aliases: ['A145P'], screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A14 5G', aliases: ['A146B'], screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A15 4G', aliases: ['A155F'], screenSize: '6.5"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A15 5G', aliases: ['A156B'], screenSize: '6.5"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A24 4G', aliases: ['A245F'], screenSize: '6.5"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A25 5G', aliases: ['A256B'], screenSize: '6.5"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_a50_a30_a20_a50s_64',
    dieCode: 'SAM A50/A30/A20 (6.4)',
    name: 'Samsung Galaxy A50 / A50s / A30 / A30s / A20 / A20s / M30 / M30s / M21 / A40s',
    screenSize: '6.4 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 3',
    notes: 'Classic Samsung Infinity-U 6.4 inch glass. High volume compatibility.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A50', aliases: ['A505F'], screenSize: '6.4"', releaseYear: 2019, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A50s', aliases: ['A507F'], screenSize: '6.4"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy A30', aliases: ['A305F'], screenSize: '6.4"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy A30s', aliases: ['A307F'], screenSize: '6.4"', releaseYear: 2019, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A20', aliases: ['A205F'], screenSize: '6.4"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy A20s', aliases: ['A207F'], screenSize: '6.5"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy M30', aliases: ['M305F'], screenSize: '6.4"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy M30s', aliases: ['M307F'], screenSize: '6.4"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy M21', aliases: ['M215F'], screenSize: '6.4"', releaseYear: 2020 },
      { brand: 'Samsung', model: 'Galaxy M31', aliases: ['M315F'], screenSize: '6.4"', releaseYear: 2020, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_a51_a52_a53_a54_65',
    dieCode: 'SAM A51/A52/A53/A54 (6.5)',
    name: 'Samsung Galaxy A51 / A52 / A52s / A53 5G / A54 5G / A55 5G / S20 FE / S21 FE',
    screenSize: '6.4" - 6.5"',
    notchType: 'punch_hole_center',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 4',
    notes: 'Center punch-hole cutout with ultra-thin black border. Fits all A5x and FE flagship killers.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A51 4G', aliases: ['A515F'], screenSize: '6.5"', releaseYear: 2019, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A52 4G/5G', aliases: ['A525F', 'A526B'], screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A52s 5G', aliases: ['A528B'], screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A53 5G', aliases: ['A536B'], screenSize: '6.5"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A54 5G', aliases: ['A546B'], screenSize: '6.4"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A55 5G', aliases: ['A556B'], screenSize: '6.6"', releaseYear: 2024, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S20 FE', aliases: ['G780F', 'G781B'], screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S21 FE', aliases: ['G990B'], screenSize: '6.4"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_a71_a72_a73_m51_67',
    dieCode: 'SAM A71/A72/A73/M51 (6.7)',
    name: 'Samsung Galaxy A71 / A72 / A73 / Note 10 Lite / S10 Lite / M51 / M52 / M53',
    screenSize: '6.7 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 5',
    notes: 'Large 6.7 inch center punch hole AMOLED glass.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A71', aliases: ['A715F'], screenSize: '6.7"', releaseYear: 2019, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A72', aliases: ['A725F'], screenSize: '6.7"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A73 5G', aliases: ['A736B'], screenSize: '6.7"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy Note 10 Lite', aliases: ['N770F'], screenSize: '6.7"', releaseYear: 2020 },
      { brand: 'Samsung', model: 'Galaxy S10 Lite', aliases: ['G770F'], screenSize: '6.7"', releaseYear: 2020 },
      { brand: 'Samsung', model: 'Galaxy M51', aliases: ['M515F'], screenSize: '6.7"', releaseYear: 2020, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy M52 5G', aliases: ['M526B'], screenSize: '6.7"', releaseYear: 2021 },
      { brand: 'Samsung', model: 'Galaxy M53 5G', aliases: ['M536B'], screenSize: '6.7"', releaseYear: 2022 }
    ]
  },
  {
    id: 'sp_sam_a32_a33_a34_a35_64',
    dieCode: 'SAM A32/A33/A34/A35 (6.4-6.6)',
    name: 'Samsung Galaxy A32 4G / A33 5G / A34 5G / A35 5G',
    screenSize: '6.4" - 6.6"',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 6',
    notes: 'Mid-range Samsung Galaxy A3x series.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A32 4G', aliases: ['A325F'], screenSize: '6.4"', releaseYear: 2021, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A33 5G', aliases: ['A336B'], screenSize: '6.4"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A34 5G', aliases: ['A346B'], screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A35 5G', aliases: ['A356B'], screenSize: '6.6"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_s24_s23_s22_61',
    dieCode: 'SAM S22/S23/S24 (6.1-6.2)',
    name: 'Samsung Galaxy S24 / S23 / S22 (Flat Compact)',
    screenSize: '6.1" - 6.2"',
    notchType: 'punch_hole_center',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 7',
    notes: 'Premium flat AMOLED glass with ultrasonic fingerprint compatibility.',
    models: [
      { brand: 'Samsung', model: 'Galaxy S22', aliases: ['S901B'], screenSize: '6.1"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S23', aliases: ['S911B'], screenSize: '6.1"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S24', aliases: ['S921B'], screenSize: '6.2"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_s24u_s23u_s22u_68',
    dieCode: 'SAM S22U/S23U/S24U (6.8)',
    name: 'Samsung Galaxy S24 Ultra / S23 Ultra / S22 Ultra / Note 20 Ultra',
    screenSize: '6.8 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 8',
    notes: 'UV Liquid glue or 3D curved full coverage glass.',
    models: [
      { brand: 'Samsung', model: 'Galaxy S24 Ultra', aliases: ['S928B', 'Flat 6.8'], screenSize: '6.8"', releaseYear: 2024, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S23 Ultra', aliases: ['S918B'], screenSize: '6.8"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy S22 Ultra', aliases: ['S908B'], screenSize: '6.8"', releaseYear: 2022, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy Note 20 Ultra', aliases: ['N985F', 'N986B'], screenSize: '6.9"', releaseYear: 2020, isPopular: true }
    ]
  },
  {
    id: 'sp_sam_a10_m10_a10s_62',
    dieCode: 'SAM A10/A10s/M10 (6.2)',
    name: 'Samsung Galaxy A10 / A10s / M10 / M10s',
    screenSize: '6.2 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 9',
    notes: '6.2 inch Infinity-V glass.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A10', aliases: ['A105F'], screenSize: '6.2"', releaseYear: 2019 },
      { brand: 'Samsung', model: 'Galaxy A10s', aliases: ['A107F'], screenSize: '6.2"', releaseYear: 2019, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy M10', aliases: ['M105F'], screenSize: '6.2"', releaseYear: 2019 }
    ]
  },
  {
    id: 'sp_sam_a05_a05s_a06_67',
    dieCode: 'SAM A05/A05s/A06 (6.7)',
    name: 'Samsung Galaxy A05 / A05s / A06',
    screenSize: '6.7 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Samsung',
    shelfLocation: 'Shelf B - Box 10',
    notes: 'Large 6.7 inch budget Samsung series.',
    models: [
      { brand: 'Samsung', model: 'Galaxy A05', aliases: ['A055F'], screenSize: '6.7"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A05s', aliases: ['A057F'], screenSize: '6.7"', releaseYear: 2023, isPopular: true },
      { brand: 'Samsung', model: 'Galaxy A06', aliases: ['A065F'], screenSize: '6.7"', releaseYear: 2024, isPopular: true }
    ]
  },

  // ==========================================
  // XIAOMI / REDMI / POCO GROUPS
  // ==========================================
  {
    id: 'sp_mi_note11_note11s_643',
    dieCode: 'MI NOTE 11 / 11S / POCO M4P (6.43)',
    name: 'Redmi Note 11 / Note 11S / Poco M4 Pro 4G / Redmi Note 10 / Note 10S',
    screenSize: '6.43 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 1',
    notes: '100% universal fit across Redmi Note 11, 11S, 10, 10S, and Poco M4 Pro 4G.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi Note 11 4G/Global', screenSize: '6.43"', releaseYear: 2022, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 11S', screenSize: '6.43"', releaseYear: 2022, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 10', screenSize: '6.43"', releaseYear: 2021, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 10S', screenSize: '6.43"', releaseYear: 2021, isPopular: true },
      { brand: 'Poco', model: 'Poco M4 Pro 4G', screenSize: '6.43"', releaseYear: 2022, isPopular: true }
    ]
  },
  {
    id: 'sp_mi_note11pro_note12pro_667',
    dieCode: 'MI NOTE 11P / 12P / X4P (6.67)',
    name: 'Redmi Note 11 Pro / 11 Pro+ / 12 Pro / Poco X4 Pro / Poco X5 Pro / Note 10 Pro',
    screenSize: '6.67 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 2',
    notes: 'Major universal Xiaomi 6.67" punch-hole flat glass group.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi Note 11 Pro 4G/5G', screenSize: '6.67"', releaseYear: 2022, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 11 Pro+', screenSize: '6.67"', releaseYear: 2022 },
      { brand: 'Xiaomi', model: 'Redmi Note 12 Pro 4G', screenSize: '6.67"', releaseYear: 2023, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 10 Pro', aliases: ['Note 10 Pro Max'], screenSize: '6.67"', releaseYear: 2021, isPopular: true },
      { brand: 'Poco', model: 'Poco X4 Pro 5G', screenSize: '6.67"', releaseYear: 2022, isPopular: true },
      { brand: 'Poco', model: 'Poco X5 Pro 5G', screenSize: '6.67"', releaseYear: 2023, isPopular: true },
      { brand: 'Poco', model: 'Poco X3 NFC / X3 Pro', screenSize: '6.67"', releaseYear: 2020, isPopular: true },
      { brand: 'Poco', model: 'Poco F3', aliases: ['Redmi K40'], screenSize: '6.67"', releaseYear: 2021, isPopular: true }
    ]
  },
  {
    id: 'sp_mi_note12_note13_667',
    dieCode: 'MI NOTE 12/13 / POCO X6 (6.67)',
    name: 'Redmi Note 12 / Note 13 4G/5G / Note 13 Pro / Poco M6 Pro / Poco X6',
    screenSize: '6.67 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 3',
    notes: 'Ultra-thin bezel flat glass for 12 & 13 series.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi Note 12 4G', screenSize: '6.67"', releaseYear: 2023, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 12 5G', screenSize: '6.67"', releaseYear: 2023 },
      { brand: 'Xiaomi', model: 'Redmi Note 13 4G', screenSize: '6.67"', releaseYear: 2024, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 13 5G', screenSize: '6.67"', releaseYear: 2024, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 13 Pro 4G', screenSize: '6.67"', releaseYear: 2024, isPopular: true },
      { brand: 'Poco', model: 'Poco M6 Pro', screenSize: '6.67"', releaseYear: 2024, isPopular: true },
      { brand: 'Poco', model: 'Poco X6 5G', screenSize: '6.67"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_mi_note8_note8t_63',
    dieCode: 'MI NOTE 8 / 8T (6.3)',
    name: 'Redmi Note 8 / Note 8T',
    screenSize: '6.3 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 4',
    notes: 'Waterdrop notch with chin bezel.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi Note 8', screenSize: '6.3"', releaseYear: 2019, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi Note 8T', screenSize: '6.3"', releaseYear: 2019 }
    ]
  },
  {
    id: 'sp_mi_note8pro_653',
    dieCode: 'MI NOTE 8 PRO (6.53)',
    name: 'Redmi Note 8 Pro',
    screenSize: '6.53 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 5',
    notes: 'Distinct 6.53 inch waterdrop glass.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi Note 8 Pro', screenSize: '6.53"', releaseYear: 2019, isPopular: true }
    ]
  },
  {
    id: 'sp_mi_9_9a_9c_10a_653',
    dieCode: 'MI 9A/9C/10A/10C (6.53)',
    name: 'Redmi 9 / 9A / 9C / 9T / 10A / 10C / Poco M3 / Poco C31',
    screenSize: '6.53 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 6',
    notes: 'Budget Xiaomi waterdrop master group.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi 9', screenSize: '6.53"', releaseYear: 2020, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 9A', screenSize: '6.53"', releaseYear: 2020, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 9C', screenSize: '6.53"', releaseYear: 2020, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 9T', screenSize: '6.53"', releaseYear: 2021, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 10A', screenSize: '6.53"', releaseYear: 2022, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 10C', screenSize: '6.71"', releaseYear: 2022, isPopular: true },
      { brand: 'Poco', model: 'Poco M3', screenSize: '6.53"', releaseYear: 2020, isPopular: true }
    ]
  },
  {
    id: 'sp_mi_12c_13c_poco_c65_674',
    dieCode: 'MI 12C/13C / C65 (6.74)',
    name: 'Redmi 12C / Redmi 13C / Poco C65',
    screenSize: '6.74 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Xiaomi',
    shelfLocation: 'Shelf C - Box 7',
    notes: '6.74 inch waterdrop large budget display.',
    models: [
      { brand: 'Xiaomi', model: 'Redmi 12C', screenSize: '6.71"', releaseYear: 2023, isPopular: true },
      { brand: 'Xiaomi', model: 'Redmi 13C', screenSize: '6.74"', releaseYear: 2023, isPopular: true },
      { brand: 'Poco', model: 'Poco C65', screenSize: '6.74"', releaseYear: 2023, isPopular: true }
    ]
  },

  // ==========================================
  // REALME / OPPO / ONEPLUS GROUPS
  // ==========================================
  {
    id: 'sp_rl_c11_c12_c15_c25_65',
    dieCode: 'RL C11/C15/C25 / 5i / C3 (6.5)',
    name: 'Realme C11 / C12 / C15 / C25 / C25s / Narzo 20 / Narzo 30A / Realme 5 / 5i / 5s / 6i / C3',
    screenSize: '6.5 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Realme',
    shelfLocation: 'Shelf D - Box 1',
    notes: 'One of the largest shared die groups in the mobile accessory industry. 13+ devices match.',
    models: [
      { brand: 'Realme', model: 'Realme C11', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Realme', model: 'Realme C12', screenSize: '6.5"', releaseYear: 2020 },
      { brand: 'Realme', model: 'Realme C15', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Realme', model: 'Realme C25', screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Realme', model: 'Realme C25s', screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Realme', model: 'Realme 5', screenSize: '6.5"', releaseYear: 2019 },
      { brand: 'Realme', model: 'Realme 5i', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Realme', model: 'Realme 5s', screenSize: '6.5"', releaseYear: 2019 },
      { brand: 'Realme', model: 'Realme 6i', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Realme', model: 'Realme C3', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Realme', model: 'Narzo 20', screenSize: '6.5"', releaseYear: 2020 },
      { brand: 'Realme', model: 'Narzo 30A', screenSize: '6.5"', releaseYear: 2021 }
    ]
  },
  {
    id: 'sp_rl_c21_c21y_c25y_65',
    dieCode: 'RL C21/C21Y/C25Y (6.5)',
    name: 'Realme C21 / C21Y / C25Y / C11 2021',
    screenSize: '6.5 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Realme',
    shelfLocation: 'Shelf D - Box 2',
    notes: 'Mini-drop 6.5 inch glass.',
    models: [
      { brand: 'Realme', model: 'Realme C21', screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Realme', model: 'Realme C21Y', screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Realme', model: 'Realme C25Y', screenSize: '6.5"', releaseYear: 2021, isPopular: true },
      { brand: 'Realme', model: 'Realme C11 2021', screenSize: '6.52"', releaseYear: 2021 }
    ]
  },
  {
    id: 'sp_rl_c30_c33_c35_c51_c53_c55_67',
    dieCode: 'RL C33/C35/C51/C53/C55 (6.6-6.74)',
    name: 'Realme C30 / C31 / C33 / C35 / C51 / C53 / C55 / C67 / Narzo N53 / N55',
    screenSize: '6.6" - 6.74"',
    notchType: 'waterdrop',
    primaryBrand: 'Realme',
    shelfLocation: 'Shelf D - Box 3',
    notes: 'Modern flat-edge Realme C series glass.',
    models: [
      { brand: 'Realme', model: 'Realme C30 / C30s', screenSize: '6.5"', releaseYear: 2022 },
      { brand: 'Realme', model: 'Realme C31', screenSize: '6.5"', releaseYear: 2022 },
      { brand: 'Realme', model: 'Realme C33', screenSize: '6.5"', releaseYear: 2022, isPopular: true },
      { brand: 'Realme', model: 'Realme C35', screenSize: '6.6"', releaseYear: 2022, isPopular: true },
      { brand: 'Realme', model: 'Realme C51', screenSize: '6.74"', releaseYear: 2023, isPopular: true },
      { brand: 'Realme', model: 'Realme C53', screenSize: '6.74"', releaseYear: 2023, isPopular: true },
      { brand: 'Realme', model: 'Realme C55', screenSize: '6.72"', releaseYear: 2023, isPopular: true },
      { brand: 'Realme', model: 'Realme C67 4G', screenSize: '6.72"', releaseYear: 2023, isPopular: true },
      { brand: 'Realme', model: 'Narzo N53', screenSize: '6.74"', releaseYear: 2023 },
      { brand: 'Realme', model: 'Narzo N55', screenSize: '6.72"', releaseYear: 2023 }
    ]
  },
  {
    id: 'sp_oppo_a15_a16_a17_a18_a38_65',
    dieCode: 'OPPO A15/A16/A17/A18/A38 (6.52)',
    name: 'Oppo A15 / A15s / A16 / A16k / A16e / A17 / A17k / A18 / A38 / A58',
    screenSize: '6.52" - 6.56"',
    notchType: 'waterdrop',
    primaryBrand: 'Oppo',
    shelfLocation: 'Shelf D - Box 4',
    notes: 'Major universal Oppo budget series group.',
    models: [
      { brand: 'Oppo', model: 'Oppo A15', screenSize: '6.52"', releaseYear: 2020, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A15s', screenSize: '6.52"', releaseYear: 2020 },
      { brand: 'Oppo', model: 'Oppo A16', screenSize: '6.52"', releaseYear: 2021, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A16k', screenSize: '6.52"', releaseYear: 2021 },
      { brand: 'Oppo', model: 'Oppo A17', screenSize: '6.56"', releaseYear: 2022, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A17k', screenSize: '6.56"', releaseYear: 2022 },
      { brand: 'Oppo', model: 'Oppo A18', screenSize: '6.56"', releaseYear: 2023, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A38', screenSize: '6.56"', releaseYear: 2023, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A58 4G', screenSize: '6.72"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_oppo_a53_a54_a55_a57_a77_65',
    dieCode: 'OPPO A53/A54/A55/A57 (6.5)',
    name: 'Oppo A53 / A53s / A54 / A55 / A57 (2022) / A77 / A96 / Reno 7',
    screenSize: '6.5 inches',
    notchType: 'punch_hole_left',
    primaryBrand: 'Oppo',
    shelfLocation: 'Shelf D - Box 5',
    notes: 'Punch-hole top left corner glass.',
    models: [
      { brand: 'Oppo', model: 'Oppo A53', screenSize: '6.5"', releaseYear: 2020, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A53s', screenSize: '6.5"', releaseYear: 2020 },
      { brand: 'Oppo', model: 'Oppo A54', screenSize: '6.51"', releaseYear: 2021, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A55', screenSize: '6.51"', releaseYear: 2021, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A57 (2022)', screenSize: '6.56"', releaseYear: 2022, isPopular: true },
      { brand: 'Oppo', model: 'Oppo A77', screenSize: '6.56"', releaseYear: 2022 },
      { brand: 'Oppo', model: 'Oppo A96', screenSize: '6.59"', releaseYear: 2022 }
    ]
  },
  {
    id: 'sp_oneplus_nord_ce2_ce3_67',
    dieCode: 'OP NORD CE2/CE3 / 9R/10R (6.7)',
    name: 'OnePlus Nord CE 2 / CE 3 Lite / Nord 2 / 9R / 10R / 11R / 12R',
    screenSize: '6.7 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'OnePlus',
    shelfLocation: 'Shelf D - Box 6',
    notes: 'OnePlus flat/curved AMOLED screen protectors.',
    models: [
      { brand: 'OnePlus', model: 'OnePlus Nord CE 3 Lite', screenSize: '6.72"', releaseYear: 2023, isPopular: true },
      { brand: 'OnePlus', model: 'OnePlus Nord 2 / 2T', screenSize: '6.43"', releaseYear: 2021, isPopular: true },
      { brand: 'OnePlus', model: 'OnePlus Nord 3', screenSize: '6.74"', releaseYear: 2023, isPopular: true },
      { brand: 'OnePlus', model: 'OnePlus 9R / 9RT', screenSize: '6.55"', releaseYear: 2021 },
      { brand: 'OnePlus', model: 'OnePlus 10R', screenSize: '6.7"', releaseYear: 2022 },
      { brand: 'OnePlus', model: 'OnePlus 11R / 12R', screenSize: '6.74"', releaseYear: 2024, isPopular: true }
    ]
  },

  // ==========================================
  // INFINIX / TECNO / ITEL GROUPS
  // ==========================================
  {
    id: 'sp_inf_hot10play_11play_682',
    dieCode: 'INF HOT 10P/11P / SMART 5 (6.82)',
    name: 'Infinix Hot 10 Play / Hot 11 Play / Hot 9 Play / Smart 5 / Smart 6 / Smart 7 / Smart 8',
    screenSize: '6.6" - 6.82"',
    notchType: 'waterdrop',
    primaryBrand: 'Infinix',
    shelfLocation: 'Shelf E - Box 1',
    notes: 'Very popular budget king glass in Middle East & emerging markets. 100% matched die.',
    models: [
      { brand: 'Infinix', model: 'Hot 10 Play', screenSize: '6.82"', releaseYear: 2021, isPopular: true },
      { brand: 'Infinix', model: 'Hot 11 Play', screenSize: '6.82"', releaseYear: 2021, isPopular: true },
      { brand: 'Infinix', model: 'Hot 9 Play', screenSize: '6.82"', releaseYear: 2020 },
      { brand: 'Infinix', model: 'Smart 5', screenSize: '6.6"', releaseYear: 2020 },
      { brand: 'Infinix', model: 'Smart 6', screenSize: '6.6"', releaseYear: 2021, isPopular: true },
      { brand: 'Infinix', model: 'Smart 7', screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Smart 8', screenSize: '6.6"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_inf_hot12_hot20_hot30_hot40_678',
    dieCode: 'INF HOT 12/20/30/40 (6.78)',
    name: 'Infinix Hot 12 / Hot 20 / Hot 30 / Hot 30i / Hot 40 / Hot 40i / Hot 40 Pro',
    screenSize: '6.78 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Infinix',
    shelfLocation: 'Shelf E - Box 2',
    notes: 'High demand 6.78" center punch-hole glass.',
    models: [
      { brand: 'Infinix', model: 'Hot 12', screenSize: '6.82"', releaseYear: 2022, isPopular: true },
      { brand: 'Infinix', model: 'Hot 20', screenSize: '6.82"', releaseYear: 2022, isPopular: true },
      { brand: 'Infinix', model: 'Hot 30', screenSize: '6.78"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Hot 30i', screenSize: '6.56"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Hot 40', screenSize: '6.78"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Hot 40i', screenSize: '6.56"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Hot 40 Pro', screenSize: '6.78"', releaseYear: 2023, isPopular: true }
    ]
  },
  {
    id: 'sp_inf_note12_note30_note40_678',
    dieCode: 'INF NOTE 12/30/40 (6.78)',
    name: 'Infinix Note 12 / Note 30 / Note 30 Pro / Note 40 / Note 40 Pro',
    screenSize: '6.78 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Infinix',
    shelfLocation: 'Shelf E - Box 3',
    notes: 'Infinix premium Note lineup AMOLED glass.',
    models: [
      { brand: 'Infinix', model: 'Note 12 G96 / 2023', screenSize: '6.7"', releaseYear: 2022, isPopular: true },
      { brand: 'Infinix', model: 'Note 30', screenSize: '6.78"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Note 30 Pro', screenSize: '6.67"', releaseYear: 2023, isPopular: true },
      { brand: 'Infinix', model: 'Note 40', screenSize: '6.78"', releaseYear: 2024, isPopular: true },
      { brand: 'Infinix', model: 'Note 40 Pro', screenSize: '6.78"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_tecno_spark7_8_9_10_20_66',
    dieCode: 'TEC SPARK 7/8/10/20 / GO (6.6)',
    name: 'Tecno Spark 7 / Spark 8 / Spark 8C / Spark 9 / Spark 10 / Spark 10C / Spark 20 / Spark 20C / Pop 5 / Pop 7',
    screenSize: '6.56" - 6.6"',
    notchType: 'waterdrop',
    primaryBrand: 'Tecno',
    shelfLocation: 'Shelf E - Box 4',
    notes: 'Tecno Spark family universal compatibility.',
    models: [
      { brand: 'Tecno', model: 'Spark 7', screenSize: '6.5"', releaseYear: 2021 },
      { brand: 'Tecno', model: 'Spark 8 / 8C / 8P', screenSize: '6.6"', releaseYear: 2021, isPopular: true },
      { brand: 'Tecno', model: 'Spark 9 / 9T', screenSize: '6.6"', releaseYear: 2022 },
      { brand: 'Tecno', model: 'Spark 10 / 10C', screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Tecno', model: 'Spark 10 Pro', screenSize: '6.78"', releaseYear: 2023, isPopular: true },
      { brand: 'Tecno', model: 'Spark 20 / 20C', screenSize: '6.6"', releaseYear: 2023, isPopular: true },
      { brand: 'Tecno', model: 'Spark 20 Pro / 20 Pro+', screenSize: '6.78"', releaseYear: 2024, isPopular: true },
      { brand: 'Tecno', model: 'Pop 5 / Pop 7', screenSize: '6.52"', releaseYear: 2023 }
    ]
  },
  {
    id: 'sp_tecno_pova_camon_68',
    dieCode: 'TEC POVA 2/3/4/5 / CAMON (6.8)',
    name: 'Tecno Pova / Pova 2 / Pova 3 / Pova 4 / Pova 5 / Camon 18 / Camon 19 / Camon 20',
    screenSize: '6.8" - 6.9"',
    notchType: 'punch_hole_center',
    primaryBrand: 'Tecno',
    shelfLocation: 'Shelf E - Box 5',
    notes: 'Large gaming phones series.',
    models: [
      { brand: 'Tecno', model: 'Pova 2', screenSize: '6.9"', releaseYear: 2021 },
      { brand: 'Tecno', model: 'Pova 3 / 4 / 5', screenSize: '6.82"', releaseYear: 2023, isPopular: true },
      { brand: 'Tecno', model: 'Camon 18 / 18P / 18 Premier', screenSize: '6.8"', releaseYear: 2021 },
      { brand: 'Tecno', model: 'Camon 19 / 19 Pro', screenSize: '6.8"', releaseYear: 2022, isPopular: true },
      { brand: 'Tecno', model: 'Camon 20 / 20 Pro', screenSize: '6.67"', releaseYear: 2023, isPopular: true }
    ]
  },

  // ==========================================
  // HONOR / HUAWEI GROUPS
  // ==========================================
  {
    id: 'sp_honor_x6_x7_x8_x9_67',
    dieCode: 'HONOR X6/X7/X8/X9 / 70/90 (6.7)',
    name: 'Honor X6 / X6a / X7 / X7a / X8 / X8a / X9 / X9a / 70 / 90 / 90 Lite / 200',
    screenSize: '6.7 inches',
    notchType: 'punch_hole_center',
    primaryBrand: 'Honor',
    shelfLocation: 'Shelf F - Box 1',
    notes: 'Honor X and numeric series flat and curved protectors.',
    models: [
      { brand: 'Honor', model: 'Honor X6 / X6a', screenSize: '6.5"', releaseYear: 2023, isPopular: true },
      { brand: 'Honor', model: 'Honor X7 / X7a', screenSize: '6.74"', releaseYear: 2023, isPopular: true },
      { brand: 'Honor', model: 'Honor X8 / X8a', screenSize: '6.7"', releaseYear: 2022, isPopular: true },
      { brand: 'Honor', model: 'Honor X9 / X9a / X9b', screenSize: '6.78"', releaseYear: 2023, isPopular: true },
      { brand: 'Honor', model: 'Honor 70 / 90 / 90 Lite', screenSize: '6.7"', releaseYear: 2023, isPopular: true },
      { brand: 'Honor', model: 'Honor 200 / 200 Lite', screenSize: '6.7"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_huawei_y6p_y7p_y8p_y9a_65',
    dieCode: 'HW Y6p/Y7p/Y9a / NOVA 7i (6.5)',
    name: 'Huawei Y6p / Y7p / Y8p / Y9a / Y9s / Nova 7i / Nova 8i / Nova 9 / Nova 10',
    screenSize: '6.5" - 6.67"',
    notchType: 'punch_hole_center',
    primaryBrand: 'Huawei',
    shelfLocation: 'Shelf F - Box 2',
    notes: 'Huawei Y & Nova series compatibility.',
    models: [
      { brand: 'Huawei', model: 'Y6p', screenSize: '6.3"', releaseYear: 2020 },
      { brand: 'Huawei', model: 'Y7p', screenSize: '6.39"', releaseYear: 2020 },
      { brand: 'Huawei', model: 'Y9a / Y9s', screenSize: '6.63"', releaseYear: 2020, isPopular: true },
      { brand: 'Huawei', model: 'Nova 7i', screenSize: '6.4"', releaseYear: 2020, isPopular: true },
      { brand: 'Huawei', model: 'Nova 8i / 9 / 10 / 11', screenSize: '6.67"', releaseYear: 2022, isPopular: true }
    ]
  },

  // ==========================================
  // GOOGLE PIXEL & VIVO GROUPS
  // ==========================================
  {
    id: 'sp_pixel_6_7_8_61',
    dieCode: 'PIXEL 6a/7a/8a / 7/8 (6.1-6.3)',
    name: 'Google Pixel 6 / 6a / 7 / 7a / 8 / 8a / 9 / 9 Pro',
    screenSize: '6.1" - 6.3"',
    notchType: 'punch_hole_center',
    primaryBrand: 'Google',
    shelfLocation: 'Shelf F - Box 3',
    notes: 'Google Pixel flat OLED display glass.',
    models: [
      { brand: 'Google', model: 'Pixel 6a', screenSize: '6.1"', releaseYear: 2022, isPopular: true },
      { brand: 'Google', model: 'Pixel 7a', screenSize: '6.1"', releaseYear: 2023, isPopular: true },
      { brand: 'Google', model: 'Pixel 8a', screenSize: '6.1"', releaseYear: 2024, isPopular: true },
      { brand: 'Google', model: 'Pixel 7', screenSize: '6.3"', releaseYear: 2022, isPopular: true },
      { brand: 'Google', model: 'Pixel 8', screenSize: '6.2"', releaseYear: 2023, isPopular: true },
      { brand: 'Google', model: 'Pixel 9 / 9 Pro', screenSize: '6.3"', releaseYear: 2024, isPopular: true }
    ]
  },
  {
    id: 'sp_vivo_y11_y12_y15_y20_y21_y33_65',
    dieCode: 'VIVO Y12/Y20/Y21/Y33 (6.51)',
    name: 'Vivo Y11 / Y12 / Y15 / Y17 / Y20 / Y20s / Y21 / Y21s / Y22 / Y33s / Y35 / Y36',
    screenSize: '6.51 inches',
    notchType: 'waterdrop',
    primaryBrand: 'Vivo',
    shelfLocation: 'Shelf F - Box 4',
    notes: 'High volume Vivo Y-series waterdrop master group.',
    models: [
      { brand: 'Vivo', model: 'Vivo Y11 / Y12 / Y15 / Y17', screenSize: '6.35"', releaseYear: 2019 },
      { brand: 'Vivo', model: 'Vivo Y20 / Y20s / Y20i', screenSize: '6.51"', releaseYear: 2020, isPopular: true },
      { brand: 'Vivo', model: 'Vivo Y21 / Y21s / Y21t', screenSize: '6.51"', releaseYear: 2021, isPopular: true },
      { brand: 'Vivo', model: 'Vivo Y22 / Y22s', screenSize: '6.55"', releaseYear: 2022, isPopular: true },
      { brand: 'Vivo', model: 'Vivo Y33s / Y35', screenSize: '6.58"', releaseYear: 2022, isPopular: true },
      { brand: 'Vivo', model: 'Vivo Y36 4G/5G', screenSize: '6.64"', releaseYear: 2023, isPopular: true },
      { brand: 'Vivo', model: 'Vivo V27 / V29 / V30', screenSize: '6.78"', releaseYear: 2024, isPopular: true }
    ]
  }
];
