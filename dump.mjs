import React from 'react';
import { renderToString } from 'react-dom/server';
import { DayPicker } from 'react-day-picker';
import { ja } from 'date-fns/locale/ja';

const html = renderToString(React.createElement(DayPicker, { locale: ja, showOutsideDays: true }));
console.log(html);
