import React, { useEffect } from 'react';
import Auth from '../components/Auth';

// --------------------------------------------------
// Сторінка реєстрації
// Використовує той самий Auth-компонент,
// але після рендера перемикає його в signup-режим.
// --------------------------------------------------
export const Signup: React.FC = () => {
  useEffect(() => {
    // Даємо компоненту завантажитися,
    // потім натискаємо кнопку переходу на реєстрацію,
    // якщо вона є на сторінці.
    const timer = window.setTimeout(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signupButton = buttons.find((button) => {
        const text = button.textContent?.trim().toLowerCase() || '';

        return (
          text.includes('зареєструватися') ||
          text.includes('create account') ||
          text.includes('sign up')
        );
      });

      signupButton?.click();
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <Auth
      t={{}}
      onAuthSuccess={() => {
        window.location.href = '/';
      }}
    />
  );
};