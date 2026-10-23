// The team's roster as listed on https://uppopallonaiset.pages.dev/pelaajat (October 2026).
// Used once to fill an empty player pool; after that, coaches edit players in the app.
import type { CaptainRole, Position } from './model'

export type RosterEntry = { number: number | null; firstName: string; lastName: string; position: Position; captain: CaptainRole }

export const WEBSITE_ROSTER: RosterEntry[] = [
  { number: 3, firstName: 'Kuura', lastName: 'Savolainen', position: 'ATT', captain: null },
  { number: 4, firstName: 'Elina', lastName: 'Salmela-Marttila', position: 'ATT', captain: null },
  { number: 5, firstName: 'Saija', lastName: 'Jokinen', position: 'DEF', captain: null },
  { number: 6, firstName: 'Heli', lastName: 'Koskinen', position: 'DEF', captain: 'captain' },
  { number: 8, firstName: 'Ella', lastName: 'Parviainen', position: 'DEF', captain: null },
  { number: 10, firstName: 'Emilia', lastName: 'Julkunen', position: 'GK', captain: null },
  { number: 11, firstName: 'Mari', lastName: 'Pesola', position: 'DEF', captain: null },
  { number: 12, firstName: 'Seda', lastName: 'Ilksöz-Jussila', position: 'ATT', captain: null },
  { number: 13, firstName: 'Diana', lastName: 'Selehov', position: 'DEF', captain: null },
  { number: 14, firstName: 'Mira', lastName: 'Koskinen', position: 'GK', captain: null },
  { number: 16, firstName: 'Jemmi', lastName: 'Levonen', position: 'ATT', captain: null },
  { number: 17, firstName: 'Maija', lastName: 'Pietilä', position: 'GK', captain: null },
  { number: 18, firstName: 'Hilla', lastName: 'Savolainen', position: 'GK', captain: null },
  { number: 20, firstName: 'Cecilia', lastName: 'Nguyen', position: 'DEF', captain: null },
  { number: 21, firstName: 'Lumo', lastName: 'Savolainen', position: 'GK', captain: null },
  { number: 22, firstName: 'Olivia', lastName: 'Hellsten', position: 'ATT', captain: null },
  { number: 24, firstName: 'Jenna', lastName: 'Alpua', position: 'DEF', captain: null },
  { number: 26, firstName: 'Niina', lastName: 'Jurva', position: 'ATT', captain: null },
  { number: 32, firstName: 'Emma', lastName: 'Krooks', position: 'DEF', captain: null },
  { number: 33, firstName: 'Elina', lastName: 'Palojärvi', position: 'GK', captain: null },
  { number: 37, firstName: 'Aino', lastName: 'Lukkarinen', position: 'ATT', captain: null },
  { number: 38, firstName: 'Mette', lastName: 'Koski', position: 'GK', captain: null },
  { number: 42, firstName: 'Nuppu', lastName: 'Uusitalo', position: 'DEF', captain: 'viceCaptain' },
  { number: 43, firstName: 'Julia', lastName: 'Mäntylä', position: 'GK', captain: null },
  { number: 48, firstName: 'Nea', lastName: 'Keränen', position: 'ATT', captain: null },
  { number: 53, firstName: 'Alisa', lastName: 'Salminen', position: 'ATT', captain: null },
  { number: 57, firstName: 'Meri', lastName: 'Luukko', position: 'DEF', captain: null },
  { number: 60, firstName: 'Maiju', lastName: 'Marttinen', position: 'DEF', captain: null },
  { number: 66, firstName: 'Thelma', lastName: 'Björk', position: 'DEF', captain: null },
  { number: 67, firstName: 'Telma', lastName: 'Viitanen', position: 'DEF', captain: null },
  { number: 73, firstName: 'Alma', lastName: 'Nevalainen', position: 'ATT', captain: null },
  { number: 77, firstName: 'Sofia', lastName: 'Raittinen', position: 'DEF', captain: null },
  { number: 81, firstName: 'Liisa', lastName: 'Selmer', position: 'GK', captain: null },
  { number: 82, firstName: 'Paula', lastName: 'Korkeakangas', position: 'GK', captain: null },
  { number: 99, firstName: 'Ilona', lastName: 'Häsänen', position: 'ATT', captain: null },
  // Listed without a number on the website.
  { number: null, firstName: 'Joye', lastName: 'Holder', position: 'ATT', captain: null },
  { number: null, firstName: 'Sini', lastName: 'Taskinen', position: 'DEF', captain: null },
  { number: null, firstName: 'Ida', lastName: 'Hirvonen', position: 'DEF', captain: null },
]
