import type { ReactNode } from 'react';
import type { ArchiveItem } from '@/content/data';
import type { SceneProps } from '../scene';
import { NotifyScene } from './NotifyScene';
import { BookingScene } from './BookingScene';
import { ReactScene } from './ReactScene';
import { XtelScene } from './XtelScene';
import { EtlScene } from './EtlScene';
import { CatalogScene } from './CatalogScene';
import { WpfScene } from './WpfScene';
import { TelemetryScene } from './TelemetryScene';
import { I18nScene } from './I18nScene';
import { WeatherScene } from './WeatherScene';

/** Each archive project's result happening, drawn on the 320×200 grid. Every number shown comes from content/data.ts. */
export const SCENES: Record<ArchiveItem['id'], (p: SceneProps) => ReactNode> = {
  notify: NotifyScene,
  booking: BookingScene,
  react19: ReactScene,
  xtel: XtelScene,
  etl: EtlScene,
  catalog: CatalogScene,
  wpf: WpfScene,
  telemetry: TelemetryScene,
  i18n: I18nScene,
  weather: WeatherScene,
};
