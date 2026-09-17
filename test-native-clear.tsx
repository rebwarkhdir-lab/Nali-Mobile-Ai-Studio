import React, { useState } from 'react';
import { renderToString } from 'react-dom/server';

function Test() {
  const [val, setVal] = useState('test');
  return (
    <input type="search" value={val} onChange={e => setVal(e.target.value)} />
  );
}
console.log(renderToString(<Test />));
