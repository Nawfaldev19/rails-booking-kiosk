import 'vitest-browser-react';
import '../../packages/ui/src/styles/index.css';

import { recordServerTime } from '@booking-kiosk/api';
import { beforeEach } from 'vitest';

// The server-clock offset lives for the whole page; start every test with none.
beforeEach(() => {
  recordServerTime(new Date(0).toISOString(), 0);
});
