import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  // Extend theme here if needed
  initialColorMode: 'light',
  useSystemColorMode: false,
});

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider theme={theme} resetCSS>
    {children}
  </ChakraProvider>
);

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };