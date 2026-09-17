const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
const add = `
@layer base {
  input[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
    appearance: none;
    display: inline-block;
    width: 14px;
    height: 14px;
    background-color: #64748b;
    mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>');
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>');
    mask-size: contain;
    -webkit-mask-size: contain;
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-position: center;
    -webkit-mask-position: center;
    cursor: pointer;
    margin-left: 8px;
  }
  input[type="search"]::-webkit-search-cancel-button:hover {
    background-color: #e2e8f0;
  }
}
`;
if (!css.includes('-webkit-search-cancel-button')) {
  fs.writeFileSync('src/index.css', css + add, 'utf8');
  console.log('CSS added');
}
