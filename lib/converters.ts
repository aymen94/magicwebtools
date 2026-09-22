export type UnitDef = { id: string; label: string; short?: string }

function labelize(id: string) {
  return id.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function linearGroup(factors: Record<string, number>, shorts: Record<string, string> = {}) {
  return Object.entries(factors).map(([id, factor]) => ({ id, label: labelize(id), short: shorts[id], factor }))
}

// Every group below is defined against a common base unit (factor === value in base units).
// Temperature is affine (has an offset), so it is modeled separately below.
const linearGroups = {
  length: linearGroup(
    { millimeters: 0.001, centimeters: 0.01, meters: 1, kilometers: 1000, inches: 0.0254, feet: 0.3048, yards: 0.9144, miles: 1609.344 },
    { millimeters: 'mm', centimeters: 'cm', meters: 'm', kilometers: 'km', inches: 'in', feet: 'ft', yards: 'yd', miles: 'mi' },
  ),
  weight: linearGroup({ milligrams: 0.000001, grams: 0.001, kilograms: 1, metric_tons: 1000, ounces: 0.028349523125, pounds: 0.45359237, stones: 6.35029318 }),
  volume: linearGroup({ milliliters: 0.000001, liters: 0.001, cubic_meters: 1, teaspoons: 0.00000492892159375, tablespoons: 0.00001478676478125, fluid_ounces: 0.0000295735295625, cups: 0.0002365882365, pints: 0.000473176473, quarts: 0.000946352946, gallons: 0.003785411784 }),
  area: linearGroup({ square_millimeters: 0.000001, square_centimeters: 0.0001, square_meters: 1, square_kilometers: 1000000, square_inches: 0.00064516, square_feet: 0.09290304, square_yards: 0.83612736, acres: 4046.8564224, hectares: 10000 }),
  force: linearGroup({ newtons: 1, kilonewtons: 1000, dynes: 0.00001, pound_force: 4.4482216152605, kilogram_force: 9.80665 }),
  pressure: linearGroup({ pascals: 1, kilopascals: 1000, megapascals: 1000000, bars: 100000, atmospheres: 101325, psi: 6894.757293168, torr: 133.3223684211 }),
  energy: linearGroup({ joules: 1, kilojoules: 1000, calories: 4.184, kilocalories: 4184, watt_hours: 3600, kilowatt_hours: 3600000, electronvolts: 1.602176634e-19 }),
  power: linearGroup({ watts: 1, kilowatts: 1000, megawatts: 1000000, horsepower: 745.6998715822702 }),
  speed: linearGroup({ meters_per_second: 1, kilometers_per_hour: 0.2777777777777778, miles_per_hour: 0.44704, feet_per_second: 0.3048, knots: 0.5144444444444444 }),
  frequency: linearGroup({ hertz: 1, kilohertz: 1000, megahertz: 1000000, gigahertz: 1000000000 }),
  angle: linearGroup({ degrees: 1, radians: 57.29577951308232, gradians: 0.9, arcminutes: 1 / 60, arcseconds: 1 / 3600 }),
  torque: linearGroup({ newton_meters: 1, pound_force_feet: 1.3558179483314004, kilogram_force_meters: 9.80665 }),
  time: linearGroup({ seconds: 1, milliseconds: 0.001, microseconds: 0.000001, nanoseconds: 0.000000001, minutes: 60, hours: 3600, days: 86400, weeks: 604800, months: 2629746, years: 31556952, decades: 315569520, centuries: 3155695200, millennia: 31556952000 }),
  data: linearGroup({ bits: 1, nibbles: 4, bytes: 8, kilobits: 1000, kibibits: 1024, kilobytes: 8000, kibibytes: 8192, megabits: 1000000, mebibits: 1048576, megabytes: 8000000, mebibytes: 8388608, gigabits: 1000000000, gibibits: 1073741824, gigabytes: 8000000000, gibibytes: 8589934592 }),
}

// Temperature uses an offset, so each unit stores its own conversions to/from Celsius (the base).
const temperatureUnits: Record<string, { label: string; toBase: (v: number) => number; fromBase: (v: number) => number }> = {
  celsius: { label: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
  fahrenheit: { label: 'Fahrenheit', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => (v * 9 / 5) + 32 },
  kelvin: { label: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
}

const fuelFactors: Record<string, { type: 'distance' | 'volume'; factor: number; label: string }> = {
  kilometers_per_liter: { type: 'distance', factor: 1, label: 'Kilometers per Liter' },
  miles_per_gallon_us: { type: 'distance', factor: 1.609344 / 3.785411784, label: 'Miles per Gallon (US)' },
  miles_per_gallon_uk: { type: 'distance', factor: 1.609344 / 4.54609, label: 'Miles per Gallon (UK)' },
  miles_per_liter: { type: 'distance', factor: 1.609344, label: 'Miles per Liter' },
  liters_per_100_kilometers: { type: 'volume', factor: 100, label: 'Liters per 100 Kilometers' },
  gallons_us_per_100_miles: { type: 'volume', factor: 100 * 1.609344 / 3.785411784, label: 'Gallons (US) per 100 Miles' },
  gallons_uk_per_100_miles: { type: 'volume', factor: 100 * 1.609344 / 4.54609, label: 'Gallons (UK) per 100 Miles' },
}

export type UnitGroupKey = keyof typeof linearGroups | 'temperature' | 'fuel'

export const unitGroups: Record<UnitGroupKey, UnitDef[]> = {
  ...(Object.fromEntries(Object.entries(linearGroups).map(([key, units]) => [key, units.map(({ id, label, short }) => ({ id, label, short }))])) as Record<keyof typeof linearGroups, UnitDef[]>),
  temperature: Object.entries(temperatureUnits).map(([id, unit]) => ({ id, label: unit.label })),
  fuel: Object.entries(fuelFactors).map(([id, unit]) => ({ id, label: unit.label })),
}

/** Finds the group that contains both unit ids, if any. */
export function findUnitGroup(from: string, to: string): { key: UnitGroupKey; units: UnitDef[] } | null {
  for (const key of Object.keys(unitGroups) as UnitGroupKey[]) {
    const units = unitGroups[key]
    if (units.some((unit) => unit.id === from) && units.some((unit) => unit.id === to)) return { key, units }
  }
  return null
}

/** Parses a `x_to_y` slug into its unit ids. */
export function parseConverterSlug(slug: string): { from: string; to: string } | null {
  const match = slug.match(/^(.+)_to_(.+)$/)
  return match ? { from: match[1], to: match[2] } : null
}

export function convertUnits(from: string, to: string, value: number): number {
  if (fuelFactors[from] && fuelFactors[to]) {
    const source = fuelFactors[from]
    const target = fuelFactors[to]
    const base = source.type === 'distance' ? value * source.factor : source.factor / value
    return target.type === 'distance' ? base / target.factor : target.factor / base
  }

  if (temperatureUnits[from] && temperatureUnits[to]) {
    return temperatureUnits[to].fromBase(temperatureUnits[from].toBase(value))
  }

  for (const units of Object.values(linearGroups)) {
    const fromUnit = units.find((unit) => unit.id === from)
    const toUnit = units.find((unit) => unit.id === to)
    if (fromUnit && toUnit) return (value * fromUnit.factor) / toUnit.factor
  }

  throw new Error('Unsupported conversion.')
}

export function convertToolValue(slug: string, value: number) {
  const parsed = parseConverterSlug(slug)
  if (!parsed) throw new Error('This converter needs a source and target unit.')
  return convertUnits(parsed.from, parsed.to, value)
}

/**
 * Resolves a converter tool slug into the unit group plus its default source/target units.
 * Powers the Length Converter style panel (number input + unit selectors) for every unit converter.
 */
export function resolveConverter(slug: string): { units: UnitDef[]; from: string; to: string } | null {
  if (slug === 'length_converter') return { units: unitGroups.length, from: 'meters', to: 'feet' }
  const parsed = parseConverterSlug(slug)
  if (!parsed) return null
  const group = findUnitGroup(parsed.from, parsed.to)
  if (!group) return null
  return { units: group.units, from: parsed.from, to: parsed.to }
}

/** Formats a converted value for display without noisy floating point tails. */
export function formatConverted(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 })
}

// Backward-compatible length helpers used by the dedicated Length Converter panel.
export type LengthUnit = 'millimeters' | 'centimeters' | 'meters' | 'kilometers' | 'inches' | 'feet' | 'yards' | 'miles'
export const lengthUnits = unitGroups.length as Array<{ id: LengthUnit; label: string; short: string }>
export function convertLength(value: number, from: LengthUnit, to: LengthUnit) {
  return convertUnits(from, to, value)
}