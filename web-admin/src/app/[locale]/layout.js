import { Kanit } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const kanit = Kanit({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ["latin", "thai"],
  variable: "--font-kanit",
});

export const metadata = {
  title: "StarHub Instance Manager",
  description: "Manage instances for StarHub Launcher",
};

export default async function LocaleLayout({ children, params: { locale } }) {
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${kanit.variable} antialiased font-sans`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
