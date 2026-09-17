const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const add = `
/* Global native clear button for search/text inputs */
@layer base {
  input[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    width: 14px;
    height: 14px;
    background-color: #64748b; /* slate-500 */
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>');
    mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>');
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: center;
    mask-position: center;
    cursor: pointer;
    margin-inline-start: 8px; /* RTL compatible margin */
    opacity: 0.8;
    transition: opacity 0.2s, background-color 0.2s;
  }
  input[type="search"]::-webkit-search-cancel-button:hover {
    background-color: #f8fafc; /* slate-50 */
    opacity: 1;
  }
  
  html.appearance-light input[type="search"]::-webkit-search-cancel-button:hover {
    background-color: #0f172a; /* slate-950 */
  }
}
`;

if (!css.includes('-webkit-search-cancel-button')) {
  fs.writeFileSync('src/index.css', css + add, 'utf8');
}
