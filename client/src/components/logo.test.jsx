import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Logo, logoSrc } from './Logo.jsx';

function renderLogo(props) {
  return render(<MemoryRouter><Logo {...props} /></MemoryRouter>);
}

describe('company logo', () => {
  it('uses the default FCB mark when no logo is saved', () => {
    expect(logoSrc(null)).toBe('/logo.png');
    expect(logoSrc({ url: '' })).toBe('/logo.png');
    const { container } = renderLogo();
    expect(container.querySelector('img').getAttribute('src')).toBe('/logo.png');
  });

  it('uses a logo saved from settings', () => {
    expect(logoSrc({ url: '/uploads/custom.png' })).toBe('/uploads/custom.png');
    expect(logoSrc('https://cdn.example/logo.png')).toBe('https://cdn.example/logo.png');
    const { container } = renderLogo({ logo: { url: '/uploads/custom.png', alt: 'Farm City' } });
    expect(container.querySelector('img').getAttribute('src')).toBe('/uploads/custom.png');
  });
});
