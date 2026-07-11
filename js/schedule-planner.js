/**
 * Dose schedule planner: titration (Reta), half-life curve, ICS calendar export.
 * Educational relative model only — not pharmacokinetic advice.
 */
(function () {
    const STORAGE_KEY = 'peptideInfoSchedules.v2';

    const PEPTIDES = [
        {
            id: 'reta',
            name: 'Retatrutide',
            page: 'retatrutide-30mg.html',
            halfLifeHours: 144,
            defaultIntervalDays: 7,
            unit: 'mg',
            titration: true,
            defaultTimesPerDay: 1,
            defaultTimes: ['09:00'],
            note: 'Usually every 5–7 days · choose slower (+2 mg) or faster (2→4→8→12) titration · graph ≈6 day half-life'
        },
        {
            id: 'tesa',
            name: 'Tesamorelin',
            page: 'tesamorelin-10mg.html',
            halfLifeHours: 12,
            defaultIntervalDays: 1,
            unit: 'mg',
            defaultTimesPerDay: 1,
            defaultTimes: ['21:00'],
            defaultDays: [1, 2, 3, 4, 5],
            note: 'Usually weekdays — defaults to Mon–Fri'
        },
        {
            id: 'cjc',
            name: 'CJC / Ipamorelin',
            page: 'cjc-1295-no-dac-with-ipamorelin.html',
            halfLifeHours: 2,
            defaultIntervalDays: 1,
            unit: 'mcg',
            defaultTimesPerDay: 2,
            defaultTimes: ['08:00', '21:00'],
            note: 'Often 1–2× daily — set both alert times below'
        },
        {
            id: 'bpc',
            name: 'BPC-157',
            page: 'bpc-157-5mg.html',
            halfLifeHours: 4,
            defaultIntervalDays: 1,
            unit: 'mcg',
            defaultTimesPerDay: 2,
            defaultTimes: ['08:00', '20:00'],
            note: '1–2× daily'
        },
        {
            id: 'ghk',
            name: 'GHK-Cu',
            page: 'ghk-cu-100mg.html',
            halfLifeHours: 6,
            defaultIntervalDays: 1,
            unit: 'mg',
            defaultTimesPerDay: 1,
            defaultTimes: ['09:00'],
            note: 'Daily Sub-Q'
        },
        {
            id: 'ghk-bpc',
            name: 'GHK-Cu + BPC-157',
            page: 'ghk-cu-100mg-with-bpc-157-10mg.html',
            halfLifeHours: 5,
            defaultIntervalDays: 1,
            unit: 'mg',
            defaultDose: 2.5,
            defaultTimesPerDay: 1,
            defaultTimes: ['09:00'],
            defaultDays: [0, 1, 2, 3, 4, 5, 6],
            note: 'Blend vial · enter GHK mg per draw (BPC scales with it) · graph uses ~5 h'
        },
        {
            id: 'selank',
            name: 'Selank',
            page: 'selank-5mg.html',
            halfLifeHours: 3,
            defaultIntervalDays: 1,
            unit: 'mcg',
            defaultTimesPerDay: 2,
            defaultTimes: ['09:00', '15:00'],
            note: 'Nasal 1–2× daily'
        },
        {
            id: 'pt141',
            name: 'PT-141',
            page: 'pt-141-10mg.html',
            halfLifeHours: 2.5,
            defaultIntervalDays: 0,
            unit: 'mg',
            prn: true,
            defaultTimesPerDay: 1,
            defaultTimes: ['18:00'],
            note: 'PRN only · max 1× / 24h'
        }
    ];

    const COLORS = ['#0f7a5f', '#3557a0', '#7a5a1e', '#8b3a4a', '#2f6f6a', '#5c4d8a', '#3d6b3d'];
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    function $(sel, root = document) { return root.querySelector(sel); }
    function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

    function parseDateInput(value) {
        if (!value) return null;
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d, 0, 0, 0, 0);
    }

    function formatDateInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDisplayDate(date) {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const y = date.getFullYear();
        return `${m}/${d}/${y} (${WEEKDAYS[date.getDay()]})`;
    }

    function formatDisplayTime(date) {
        let h = date.getHours();
        const min = String(date.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${min} ${ampm}`;
    }

    function sanitizeNumberInputValue(value) {
        if (value == null || value === '') return value;
        let s = String(value).trim();
        if (s === '-' || s === '.' || s === '-.') return s;
        const neg = s.startsWith('-');
        if (neg) s = s.slice(1);
        if (s.startsWith('.')) s = `0${s}`;
        // Strip leading zeros: 07 → 7, 00.5 → 0.5, 000 → 0 (keep a lone 0 / 0.x)
        if (/^0+\d/.test(s)) s = s.replace(/^0+/, '');
        if (s.startsWith('.')) s = `0${s}`;
        if (s === '') s = '0';
        return `${neg ? '-' : ''}${s}`;
    }

    function bindNumberInputGuards(root) {
        if (!root || root.dataset.numGuardBound === '1') return;
        root.dataset.numGuardBound = '1';
        root.addEventListener('input', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement)) return;
            if (el.type !== 'number') return;
            const next = sanitizeNumberInputValue(el.value);
            if (next !== el.value) el.value = next;
        });
        root.addEventListener('blur', (e) => {
            const el = e.target;
            if (!(el instanceof HTMLInputElement) || el.type !== 'number') return;
            if (el.value === '' || el.value === '-' || el.value === '.') return;
            const next = sanitizeNumberInputValue(el.value);
            if (next !== el.value) el.value = next;
        }, true);
    }

    function parseTimeInput(value) {
        const raw = value || '09:00';
        const [hh, mm] = raw.split(':').map(Number);
        return {
            hours: Number.isFinite(hh) ? hh : 9,
            minutes: Number.isFinite(mm) ? mm : 0
        };
    }

    function applyTime(date, timeStr) {
        const { hours, minutes } = parseTimeInput(timeStr);
        const next = new Date(date.getTime());
        next.setHours(hours, minutes, 0, 0);
        return next;
    }

    function getSelectedTimes() {
        const timesPerDay = Math.max(1, parseInt($('#pf-times-per-day')?.value || '1', 10));
        const times = $all('.pf-time-input').map((el) => el.value || '09:00').slice(0, timesPerDay);
        while (times.length < timesPerDay) times.push(times[times.length - 1] || '09:00');
        return times;
    }

    function expandEventsWithTimes(dayEvents, times, unit) {
        const out = [];
        dayEvents.forEach((ev) => {
            times.forEach((timeStr) => {
                const when = applyTime(ev.date, timeStr);
                out.push({
                    date: when,
                    dose: ev.dose,
                    label: ev.label.includes(unit) ? ev.label : `${ev.dose} ${unit}`
                });
            });
        });
        return out;
    }

    function halfLifeLabel(hours) {
        if (hours >= 24) {
            const days = hours / 24;
            const rounded = Math.round(days * 10) / 10;
            return `graph half-life ≈ ${rounded} day${rounded === 1 ? '' : 's'} (${hours}h)`;
        }
        return `graph half-life ≈ ${hours} hour${hours === 1 ? '' : 's'}`;
    }

    function addDays(date, days) {
        const next = new Date(date.getTime());
        next.setDate(next.getDate() + days);
        return next;
    }

    function loadSchedules() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveSchedules(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function peptideById(id) {
        return PEPTIDES.find((p) => p.id === id);
    }

    /**
     * Retatrutide titration along a dose ladder (e.g. slow 2–12 by +2, or fast 2→4→8→12).
     * Stay at each listed step for `dosesPerStep` injections, then move to the next step
     * below target; finally maintain at targetDose.
     */
    function buildRetaEvents({
        currentDose,
        dosesAlreadyTaken,
        targetDose,
        startDate,
        stopDate,
        intervalDays = 7,
        dosesPerStep = 4,
        maintainWeeks = 26,
        steps = [2, 4, 6, 8, 10, 12]
    }) {
        const events = [];
        const stepDays = Math.max(1, Math.round(intervalDays) || 7);
        let cursor = new Date(startDate.getTime());
        const endCap = stopDate || addDays(startDate, maintainWeeks * stepDays + 200);
        const ladder = (steps || []).filter((d) => d > 0).sort((a, b) => a - b);

        // Starting at 0 mg = not yet on therapy.
        if (currentDose > 0) {
            const remainingAtCurrent = Math.max(0, dosesPerStep - Math.max(0, dosesAlreadyTaken));
            for (let i = 0; i < remainingAtCurrent; i++) {
                if (cursor > endCap) break;
                events.push({ date: new Date(cursor), dose: currentDose, label: `${currentDose} mg` });
                cursor = addDays(cursor, stepDays);
            }
        }

        const upcoming = ladder.filter((d) => d > currentDose && d < targetDose - 0.0001);
        for (const stepDose of upcoming) {
            for (let i = 0; i < dosesPerStep; i++) {
                if (cursor > endCap) return events;
                events.push({ date: new Date(cursor), dose: stepDose, label: `${stepDose} mg` });
                cursor = addDays(cursor, stepDays);
            }
        }

        const maintainUntil = stopDate || addDays(cursor, maintainWeeks * stepDays);
        while (cursor <= maintainUntil && cursor <= endCap) {
            events.push({ date: new Date(cursor), dose: targetDose, label: `${targetDose} mg (maintain)` });
            cursor = addDays(cursor, stepDays);
        }

        return events;
    }

    function getRetaTitrationSteps() {
        const path = $('#pf-titration-path')?.value || 'slow';
        if (path === 'fast') {
            const include6 = $('#pf-optional-6')?.checked;
            return include6 ? [2, 4, 6, 8, 12] : [2, 4, 8, 12];
        }
        return [2, 4, 6, 8, 10, 12];
    }

    function buildFixedEvents({ dose, startDate, stopDate, daysOfWeek }) {
        const events = [];
        const allowed = new Set((daysOfWeek && daysOfWeek.length) ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
        let cursor = new Date(startDate.getTime());
        cursor.setHours(0, 0, 0, 0);
        const end = stopDate || addDays(startDate, 90);

        while (cursor <= end) {
            if (allowed.has(cursor.getDay())) {
                events.push({ date: new Date(cursor), dose, label: String(dose) });
            }
            cursor = addDays(cursor, 1);
        }

        return events;
    }

    /** Fixed dose every N calendar days (e.g. Reta every 6 days). */
    function buildIntervalEvents({ dose, startDate, stopDate, intervalDays }) {
        const events = [];
        const step = Math.max(1, Math.round(intervalDays) || 1);
        let cursor = new Date(startDate.getTime());
        cursor.setHours(0, 0, 0, 0);
        const end = stopDate || addDays(startDate, Math.max(90, step * 16));

        while (cursor <= end) {
            events.push({ date: new Date(cursor), dose, label: String(dose) });
            cursor = addDays(cursor, step);
        }

        return events;
    }

    function relativeConcentration(events, halfLifeHours, sampleHours) {
        const hl = Math.max(0.25, Number(halfLifeHours) || 24);
        const k = Math.LN2 / hl;
        return sampleHours.map((tHours) => {
            let c = 0;
            for (const ev of events) {
                const ageH = (tHours - ev.t0Hours);
                if (ageH >= 0) c += ev.dose * Math.exp(-k * ageH);
            }
            return c;
        });
    }

    /** Dense sample grid so weekly peaks don't alias into a fake rise/fall pattern. */
    function buildSampleHours(hoursSpan, doseTimesHours) {
        const span = Math.max(24, hoursSpan);
        const step = Math.min(4, Math.max(1.5, span / 800));
        const points = new Set([0, span]);
        for (let t = 0; t <= span; t += step) points.add(Math.round(t * 1000) / 1000);
        (doseTimesHours || []).forEach((t0) => {
            if (t0 < 0 || t0 > span) return;
            points.add(t0);
            points.add(Math.min(span, t0 + 0.05));
        });
        return [...points].sort((a, b) => a - b);
    }

    function resolveHalfLifeHours(sched) {
        const fromConfig = peptideById(sched.peptideId)?.halfLifeHours;
        if (fromConfig != null && !sched.custom) return fromConfig;
        return sched.halfLifeHours || 24;
    }

    function calendarDayKey(date) {
        return formatDateInput(date);
    }

    function daysBetweenDates(a, b) {
        const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
        const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.round((b0.getTime() - a0.getTime()) / 86400000);
    }

    function byDayCode(dayIndex) {
        return ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][dayIndex];
    }

    /**
     * Detect a calendar recurrence from sorted same-time-of-day dates.
     * Returns an RRULE body (without the "RRULE:" prefix) or null.
     */
    function detectRecurrenceRule(sortedDates) {
        if (!sortedDates || sortedDates.length <= 1) return null;

        const diffs = [];
        for (let i = 1; i < sortedDates.length; i++) {
            const d = daysBetweenDates(sortedDates[i - 1], sortedDates[i]);
            if (d < 1) return null;
            diffs.push(d);
        }

        if (diffs.every((d) => d === diffs[0])) {
            return `FREQ=DAILY;INTERVAL=${diffs[0]};COUNT=${sortedDates.length}`;
        }

        const weekdays = [...new Set(sortedDates.map((d) => d.getDay()))].sort((a, b) => a - b);
        const daySet = new Set(weekdays);
        const start = sortedDates[0];
        const end = sortedDates[sortedDates.length - 1];
        const expected = [];
        let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        while (cursor <= endDay) {
            if (daySet.has(cursor.getDay())) expected.push(calendarDayKey(cursor));
            cursor = addDays(cursor, 1);
        }
        const actual = sortedDates.map(calendarDayKey);
        if (expected.length === actual.length && expected.every((k, i) => k === actual[i])) {
            return `FREQ=WEEKLY;BYDAY=${weekdays.map(byDayCode).join(',')};COUNT=${sortedDates.length}`;
        }

        return null;
    }

    /**
     * Collapse a schedule's events into series where dose/label + clock time share a regular pattern.
     * Titration becomes one series per dose step; fixed courses become one (or few) recurring events.
     */
    function groupEventsIntoSeries(events) {
        const groups = new Map();
        events.forEach((ev) => {
            const date = new Date(ev.date);
            const tod = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            const key = `${ev.label}@@${tod}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ ...ev, date });
        });

        const seriesList = [];

        function pushBestChunks(run) {
            if (!run.length) return;
            const rule = detectRecurrenceRule(run.map((e) => e.date));
            if (rule || run.length === 1) {
                seriesList.push({ events: run, rrule: rule });
                return;
            }
            let i = 0;
            while (i < run.length) {
                let bestEnd = i;
                let bestRule = null;
                for (let j = i + 1; j < run.length; j++) {
                    const candidate = detectRecurrenceRule(run.slice(i, j + 1).map((e) => e.date));
                    if (candidate) {
                        bestEnd = j;
                        bestRule = candidate;
                    } else if (bestRule) {
                        break;
                    }
                }
                if (bestRule) {
                    seriesList.push({ events: run.slice(i, bestEnd + 1), rrule: bestRule });
                    i = bestEnd + 1;
                } else {
                    seriesList.push({ events: [run[i]], rrule: null });
                    i += 1;
                }
            }
        }

        groups.forEach((list) => {
            list.sort((a, b) => a.date.getTime() - b.date.getTime());
            pushBestChunks(list);
        });

        return seriesList;
    }

    const PLANNER_URL = 'https://peptide-info.github.io/vials/';
    const PEPTIDE_BASE_URL = `${PLANNER_URL}peptides/`;

    function scheduleNotesUrl(sched) {
        if (sched.peptideId === 'custom' || sched.custom) {
            return PLANNER_URL;
        }
        if (sched.pageUrl) return sched.pageUrl;
        const page = sched.page || peptideById(sched.peptideId)?.page;
        if (page) return `${PEPTIDE_BASE_URL}${page}`;
        return PLANNER_URL;
    }

    function buildIcs(schedules) {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Peptide Info//Schedule Planner//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        const stamp = new Date();
        const dtStamp = toIcsUtc(stamp);

        schedules.forEach((sched) => {
            const link = scheduleNotesUrl(sched);
            const desc = escapeIcs(`Peptide schedule from Peptide Info planner\n${link}`);
            const seriesList = groupEventsIntoSeries(sched.events || []);
            seriesList.forEach((series, seriesIdx) => {
                const first = series.events[0];
                const start = first.date;
                const end = new Date(start.getTime() + 30 * 60 * 1000);
                const uid = `${sched.id}-s${seriesIdx}@peptide-info`;
                const summary = escapeIcs(`${sched.name}: ${first.label}`);

                lines.push('BEGIN:VEVENT');
                lines.push(`UID:${uid}`);
                lines.push(`DTSTAMP:${dtStamp}`);
                lines.push(`DTSTART:${toIcsLocal(start)}`);
                lines.push(`DTEND:${toIcsLocal(end)}`);
                if (series.rrule) {
                    lines.push(`RRULE:${series.rrule}`);
                }
                lines.push(`SUMMARY:${summary}`);
                lines.push(`DESCRIPTION:${desc}`);
                lines.push(`URL:${link}`);
                lines.push('END:VEVENT');
            });
        });

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    function toIcsLocal(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${y}${m}${d}T${hh}${mm}${ss}`;
    }

    function toIcsUtc(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    }

    function escapeIcs(text) {
        return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    }

    function downloadText(filename, text, mime) {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function timeFieldsHtml(peptide, { forceMax } = {}) {
        const count = Math.max(1, peptide.defaultTimesPerDay || 1);
        const defaults = peptide.defaultTimes || ['09:00'];
        const maxTimes = forceMax != null
            ? forceMax
            : (peptide.titration || peptide.prn ? 1 : 4);
        const options = Array.from({ length: maxTimes }, (_, i) => {
            const n = i + 1;
            return `<option value="${n}" ${n === Math.min(count, maxTimes) ? 'selected' : ''}>${n}× per day</option>`;
        }).join('');

        return `
            <label class="field"><span>Times per day</span>
                <select id="pf-times-per-day">${options}</select>
            </label>
            <div id="pf-time-slots" class="time-slots"></div>
        `;
    }

    function renderTimeSlots(count, defaults = ['09:00']) {
        const host = $('#pf-time-slots');
        if (!host) return;
        const n = Math.max(1, count);
        host.innerHTML = Array.from({ length: n }, (_, i) => {
            const val = defaults[i] || defaults[defaults.length - 1] || '09:00';
            return `<label class="field"><span>Alert time ${i + 1}</span><input type="time" class="pf-time-input" value="${val}"></label>`;
        }).join('');
    }

    function bindTimeFields(peptide, forceMax) {
        const select = $('#pf-times-per-day');
        if (!select) {
            renderTimeSlots(1, peptide.defaultTimes);
            return;
        }
        const sync = () => {
            const n = Math.max(1, parseInt(select.value, 10) || 1);
            const capped = forceMax != null ? Math.min(n, forceMax) : n;
            const current = $all('.pf-time-input').map((el) => el.value);
            const defaults = current.length ? current : (peptide.defaultTimes || ['09:00']);
            renderTimeSlots(capped, defaults);
        };
        select.addEventListener('change', sync);
        sync();
    }

    function intervalFieldHtml(defaultDays = 7, { min = 1, max = 14, hint } = {}) {
        return `
            <label class="field" id="pf-interval-wrap">
                <span>Every X days</span>
                <input type="number" inputmode="numeric" id="pf-interval" value="${defaultDays}" min="${min}" max="${max}" step="1">
            </label>
            ${hint ? `<p class="hint field-span" id="pf-interval-hint">${hint}</p>` : ''}
        `;
    }

    function scheduleModeHtml({ defaultMode = 'dow', intervalDays = 7 } = {}) {
        return `
            <div class="field field-span">
                <span>Schedule type</span>
                <div class="mode-row" id="pf-schedule-mode">
                    <label class="mode-chip">
                        <input type="radio" name="pf-sched-mode" value="interval" ${defaultMode === 'interval' ? 'checked' : ''}>
                        <span>Every X days</span>
                    </label>
                    <label class="mode-chip">
                        <input type="radio" name="pf-sched-mode" value="dow" ${defaultMode === 'dow' ? 'checked' : ''}>
                        <span>Days of week</span>
                    </label>
                </div>
            </div>
            ${intervalFieldHtml(intervalDays, { hint: 'e.g. 6 = dose every 6 days from the start date' })}
            <div id="pf-dow-block"></div>
        `;
    }

    function daysOfWeekHtml(peptide) {
        const labels = [
            { d: 0, short: 'Sun' },
            { d: 1, short: 'Mon' },
            { d: 2, short: 'Tue' },
            { d: 3, short: 'Wed' },
            { d: 4, short: 'Thu' },
            { d: 5, short: 'Fri' },
            { d: 6, short: 'Sat' }
        ];
        const selected = new Set(peptide.defaultDays || [0, 1, 2, 3, 4, 5, 6]);
        return `
            <div class="field field-span">
                <span>Days of week</span>
                <div class="dow-row" id="pf-dow">
                    ${labels.map(({ d, short }) => `
                        <label class="dow-chip">
                            <input type="checkbox" value="${d}" ${selected.has(d) ? 'checked' : ''}>
                            <span>${short}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="dow-presets">
                    <button type="button" class="chip-btn" data-dow="1,2,3,4,5">Mon–Fri</button>
                    <button type="button" class="chip-btn" data-dow="0,1,2,3,4,5,6">Every day</button>
                    <button type="button" class="chip-btn" data-dow="1,3,5">M/W/F</button>
                    <button type="button" class="chip-btn" data-dow="1,4">Mon/Thu</button>
                </div>
            </div>
        `;
    }

    function bindDowPresets() {
        $all('[data-dow]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const wanted = new Set(btn.getAttribute('data-dow').split(',').map(Number));
                $all('#pf-dow input[type="checkbox"]').forEach((cb) => {
                    cb.checked = wanted.has(parseInt(cb.value, 10));
                });
            });
        });
    }

    function getSelectedDays() {
        const checked = $all('#pf-dow input[type="checkbox"]:checked').map((cb) => parseInt(cb.value, 10));
        return checked.length ? checked : [0, 1, 2, 3, 4, 5, 6];
    }

    function getIntervalDays(fallback = 7) {
        const inputs = $all('#pf-interval');
        const el = inputs.find((i) => !i.closest('[hidden]')) || inputs[0];
        const n = parseInt(el?.value, 10);
        return Number.isFinite(n) && n >= 1 ? n : fallback;
    }

    function getScheduleMode() {
        const radios = $all('input[name="pf-sched-mode"]');
        const checked = radios.find((r) => r.checked && !r.closest('[hidden]'));
        return checked?.value || radios.find((r) => r.checked)?.value || 'dow';
    }

    function syncScheduleModeVisibility() {
        const mode = getScheduleMode();
        const intervalWrap = $('#pf-interval-wrap');
        const intervalHint = $('#pf-interval-hint');
        const dowBlock = $('#pf-dow-block');
        if (intervalWrap) intervalWrap.hidden = mode !== 'interval';
        if (intervalHint) intervalHint.hidden = mode !== 'interval';
        if (dowBlock) dowBlock.hidden = mode !== 'dow';
    }

    function bindScheduleMode(peptideForDow) {
        const dowBlock = $('#pf-dow-block');
        if (dowBlock && !dowBlock.innerHTML.trim()) {
            dowBlock.innerHTML = daysOfWeekHtml(peptideForDow || {});
            bindDowPresets();
        }
        $all('input[name="pf-sched-mode"]').forEach((radio) => {
            radio.addEventListener('change', syncScheduleModeVisibility);
        });
        syncScheduleModeVisibility();
    }

    function customFieldsHtml() {
        return `
            <label class="field field-span" id="pf-custom-wrap" hidden>
                <span>Custom peptide name</span>
                <input type="text" id="pf-custom-name" placeholder="e.g. Semax" maxlength="60">
            </label>
            <label class="field" id="pf-custom-unit-wrap" hidden>
                <span>Unit</span>
                <select id="pf-custom-unit">
                    <option value="mg" selected>mg</option>
                    <option value="mcg">mcg</option>
                </select>
            </label>
            <label class="field" id="pf-custom-hl-wrap" hidden>
                <span>Half-life (hours, for graph)</span>
                <input type="number" inputmode="decimal" id="pf-custom-hl" value="24" min="0.5" step="any">
            </label>
        `;
    }

    function setCustomVisible(show) {
        ['pf-custom-wrap', 'pf-custom-unit-wrap', 'pf-custom-hl-wrap'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.hidden = !show;
        });
    }

    function resolvePeptideSelection() {
        const select = $('#planner-peptide');
        const id = select?.value;
        if (id === 'custom') {
            const name = ($('#pf-custom-name')?.value || '').trim();
            if (!name) throw new Error('Enter a custom peptide name');
            const unit = $('#pf-custom-unit')?.value || 'mg';
            const halfLifeHours = parseFloat($('#pf-custom-hl')?.value) || 24;
            return {
                id: 'custom',
                name,
                unit,
                halfLifeHours,
                defaultTimesPerDay: 1,
                defaultTimes: ['09:00'],
                defaultDays: [0, 1, 2, 3, 4, 5, 6],
                custom: true
            };
        }
        return peptideById(id);
    }

    function renderRetaForm(peptide) {
        const wrap = $('#planner-fields');
        const today = formatDateInput(new Date());
        const interval = peptide.defaultIntervalDays || 7;

        wrap.innerHTML = `
            <label class="check-row field-span">
                <input type="checkbox" id="pf-follow-titration" checked>
                <span>Follow titration schedule</span>
            </label>
            <p class="hint field-span" id="pf-titration-hint">Stay at each dose for 4 injections, then move to the next step on the path until target. Spacing is usually 5–7 days.</p>

            <div id="pf-titration-block">
                <label class="field field-span"><span>Titration path</span>
                    <select id="pf-titration-path">
                        <option value="slow" selected>Slower — 2 → 4 → 6 → 8 → 10 → 12</option>
                        <option value="fast">Faster — 2 → 4 → 8 → 12</option>
                    </select>
                </label>
                <label class="check-row field-span" id="pf-optional-6-wrap" hidden>
                    <input type="checkbox" id="pf-optional-6">
                    <span>Include optional 6 mg bridge (between 4 and 8)</span>
                </label>
                <label class="field"><span>Current dose (mg)</span><input type="number" inputmode="decimal" id="pf-current" value="0" min="0" step="0.5"></label>
                <label class="field"><span>Doses already taken at this dose</span><input type="number" inputmode="numeric" id="pf-taken" value="0" min="0" step="1"></label>
                <label class="field"><span>Target dose (mg)</span><input type="number" inputmode="decimal" id="pf-target" value="12" min="0" step="0.5"></label>
            </div>

            <div id="pf-fixed-reta-block" hidden>
                <label class="field"><span>Dose each injection (mg)</span><input type="number" inputmode="decimal" id="pf-dose" value="2" min="0" step="0.5"></label>
                ${scheduleModeHtml({ defaultMode: 'interval', intervalDays: interval })}
            </div>

            <div id="pf-reta-interval-block">
                ${intervalFieldHtml(interval, {
                    min: 1,
                    max: 14,
                    hint: 'Commonly 5–7 days between injections. Titration steps after 4 doses at this spacing.'
                })}
            </div>

            <label class="field"><span>Start date (next dose)</span><input type="date" id="pf-start" value="${today}"></label>
            <label class="field"><span>Stop date (optional)</span><input type="date" id="pf-stop"></label>
            <div id="pf-reta-times">${timeFieldsHtml(peptide, { forceMax: 1 })}</div>
        `;

        const follow = $('#pf-follow-titration');
        const pathSelect = $('#pf-titration-path');
        const syncOptional6 = () => {
            const wrap = $('#pf-optional-6-wrap');
            if (wrap) wrap.hidden = pathSelect?.value !== 'fast';
        };
        pathSelect?.addEventListener('change', syncOptional6);
        syncOptional6();

        const syncTitrationUi = () => {
            const on = !!follow?.checked;
            const titBlock = $('#pf-titration-block');
            const fixedBlock = $('#pf-fixed-reta-block');
            const intervalOnly = $('#pf-reta-interval-block');
            const hint = $('#pf-titration-hint');
            if (titBlock) titBlock.hidden = !on;
            if (fixedBlock) fixedBlock.hidden = on;
            if (intervalOnly) intervalOnly.hidden = !on;
            if (hint) {
                hint.textContent = on
                    ? 'Stay at each dose for 4 injections, then move to the next step on the path until target. Spacing is usually 5–7 days.'
                    : 'Fixed dose only — use every X days, or days of week for smaller split doses (e.g. Mon/Thu).';
            }

            const timesHost = $('#pf-reta-times');
            if (timesHost) {
                const maxTimes = on ? 1 : 4;
                const fake = {
                    ...peptide,
                    titration: on,
                    defaultTimesPerDay: on ? 1 : 2,
                    defaultTimes: on ? ['09:00'] : ['09:00', '21:00']
                };
                timesHost.innerHTML = timeFieldsHtml(fake, { forceMax: maxTimes });
                bindTimeFields(fake, maxTimes);
            }
        };

        follow?.addEventListener('change', syncTitrationUi);

        // Fixed-mode schedule controls (only matter when titration off)
        const dowBlock = $('#pf-dow-block');
        if (dowBlock) {
            dowBlock.innerHTML = daysOfWeekHtml({ defaultDays: [1, 4] });
            bindDowPresets();
        }
        $all('input[name="pf-sched-mode"]').forEach((radio) => {
            radio.addEventListener('change', syncScheduleModeVisibility);
        });
        syncScheduleModeVisibility();
        syncTitrationUi();
    }

    function renderFormFields(peptide) {
        const wrap = $('#planner-fields');
        const today = formatDateInput(new Date());
        const isCustom = peptide?.id === 'custom' || $('#planner-peptide')?.value === 'custom';

        if (peptide?.titration) {
            renderRetaForm(peptide);
            return;
        }

        if (peptide?.prn) {
            wrap.innerHTML = `
                <label class="field"><span>Dose (${peptide.unit})</span><input type="number" inputmode="decimal" id="pf-dose" value="1" min="0" step="0.1"></label>
                <label class="field"><span>Event date</span><input type="date" id="pf-start" value="${today}"></label>
                ${timeFieldsHtml(peptide)}
                <p class="hint field-span">PRN peptide — adds a single calendar reminder.</p>
            `;
            bindTimeFields(peptide);
            return;
        }

        // Standard / custom — days of week or every X days
        const unit = isCustom ? 'mg' : peptide.unit;
        const doseDefault = peptide.defaultDose != null ? peptide.defaultDose : (unit === 'mg' ? 2 : 250);
        const defaultMode = (peptide.defaultIntervalDays && peptide.defaultIntervalDays > 1) ? 'interval' : 'dow';
        wrap.innerHTML = `
            ${customFieldsHtml()}
            <label class="field"><span>Dose (<span id="pf-unit-label">${unit}</span>)</span><input type="number" inputmode="decimal" id="pf-dose" value="${doseDefault}" min="0" step="any"></label>
            <label class="field"><span>Start date</span><input type="date" id="pf-start" value="${today}"></label>
            <label class="field"><span>Stop date</span><input type="date" id="pf-stop" value="${formatDateInput(addDays(new Date(), 84))}"></label>
            ${scheduleModeHtml({
                defaultMode,
                intervalDays: peptide.defaultIntervalDays > 1 ? peptide.defaultIntervalDays : 7
            })}
            ${timeFieldsHtml(isCustom ? { defaultTimesPerDay: 1, defaultTimes: ['09:00'] } : peptide)}
            <p class="hint field-span">Choose every X days (e.g. every 6) or pick weekdays, then set alert times.</p>
        `;

        setCustomVisible(isCustom);
        if (isCustom) {
            $('#pf-custom-unit')?.addEventListener('change', (e) => {
                const label = $('#pf-unit-label');
                if (label) label.textContent = e.target.value;
            });
        }
        bindScheduleMode(isCustom ? { defaultDays: [0, 1, 2, 3, 4, 5, 6] } : peptide);
        bindTimeFields(isCustom ? { defaultTimesPerDay: 1, defaultTimes: ['09:00'] } : peptide);
    }

    const DAY_NAMES_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function formatDaysOfWeekPhrase(days) {
        const sorted = [...new Set(days || [])].sort((a, b) => a - b);
        if (!sorted.length || sorted.length === 7) return 'every day';
        if (sorted.join(',') === '1,2,3,4,5') return 'Monday–Friday';
        if (sorted.join(',') === '0,6') return 'weekends';
        if (sorted.length === 1) return `${DAY_NAMES_LONG[sorted[0]]}s`;
        if (sorted.length === 2) {
            return `${DAY_NAMES_LONG[sorted[0]]}s and ${DAY_NAMES_LONG[sorted[1]]}s`;
        }
        return sorted.map((d) => DAY_NAMES_SHORT[d]).join(', ');
    }

    function formatTimesPhrase(times) {
        const list = (times || []).filter(Boolean);
        if (!list.length) return '';
        const labels = list.map((t) => {
            const [hh, mm] = t.split(':').map(Number);
            const d = new Date();
            d.setHours(hh || 0, mm || 0, 0, 0);
            return formatDisplayTime(d);
        });
        if (labels.length === 1) return `at ${labels[0]}`;
        if (labels.length === 2) return `at ${labels[0]} and ${labels[1]}`;
        return `at ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
    }

    function formatShortDate(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return '';
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }

    function formatDosePhrase(dose, unit) {
        const n = Number(dose);
        const u = unit || 'mg';
        if (!Number.isFinite(n)) return String(dose);
        const text = Number.isInteger(n) ? String(n) : String(n);
        return `${text}${u}`;
    }

    function dosePhaseStarts(events) {
        const phases = [];
        (events || []).forEach((ev) => {
            const dose = Number(ev.dose);
            const date = ev.date instanceof Date ? ev.date : new Date(ev.date);
            if (!Number.isFinite(dose) || Number.isNaN(date.getTime())) return;
            if (!phases.length || phases[phases.length - 1].dose !== dose) {
                phases.push({ dose, date });
            }
        });
        return phases;
    }

    /** High-level plan captured from the form when adding a schedule. */
    function collectPlanSummaryFromForm(peptide, events) {
        const start = parseDateInput($('#pf-start')?.value);
        const stop = parseDateInput($('#pf-stop')?.value);
        const timesPhrase = formatTimesPhrase(getSelectedTimes());
        const unit = peptide.unit || 'mg';
        const name = peptide.name || 'Peptide';
        const throughBullet = stop ? `Through ${formatShortDate(stop)}` : null;
        const alertBullet = timesPhrase ? `Alerts ${timesPhrase}` : null;

        if (peptide.prn) {
            const dose = parseFloat($('#pf-dose')?.value);
            return {
                headline: `${name} ${formatDosePhrase(dose, unit)} — one-time / PRN`,
                bullets: [
                    `On ${formatShortDate(start)}`,
                    alertBullet
                ].filter(Boolean)
            };
        }

        if (peptide.titration) {
            const followTitration = $('#pf-follow-titration')?.checked !== false;
            const intervalDays = getIntervalDays(peptide.defaultIntervalDays || 7);
            if (followTitration) {
                const phases = dosePhaseStarts(events);
                if (phases.length) {
                    const bullets = phases.map((phase, i) => (
                        i === 0
                            ? `${formatDosePhrase(phase.dose, unit)} starting ${formatShortDate(phase.date)}`
                            : `${formatDosePhrase(phase.dose, unit)} from ${formatShortDate(phase.date)}`
                    ));
                    if (throughBullet) bullets.push(throughBullet);
                    if (alertBullet) bullets.push(alertBullet);
                    return {
                        headline: `${name} · every ${intervalDays} day${intervalDays === 1 ? '' : 's'}`,
                        bullets
                    };
                }
                const steps = getRetaTitrationSteps();
                const pathLabel = ($('#pf-titration-path')?.value || 'slow') === 'fast' ? 'Faster' : 'Slower';
                return {
                    headline: `${name} · ${pathLabel.toLowerCase()} titration · every ${intervalDays} days`,
                    bullets: [
                        `${pathLabel} path: ${steps.join(' → ')} mg`,
                        `Starting ${formatShortDate(start)}`,
                        throughBullet,
                        alertBullet
                    ].filter(Boolean)
                };
            }

            const dose = parseFloat($('#pf-dose')?.value);
            const mode = getScheduleMode();
            const cadence = mode === 'interval'
                ? `every ${intervalDays} day${intervalDays === 1 ? '' : 's'}`
                : `on ${formatDaysOfWeekPhrase(getSelectedDays())}`;
            return {
                headline: `${name} ${formatDosePhrase(dose, unit)} · ${cadence}`,
                bullets: [
                    `Starting ${formatShortDate(start)}`,
                    throughBullet,
                    alertBullet
                ].filter(Boolean)
            };
        }

        const dose = parseFloat($('#pf-dose')?.value);
        const mode = getScheduleMode();
        const cadence = mode === 'interval'
            ? `every ${getIntervalDays(7)} day${getIntervalDays(7) === 1 ? '' : 's'}`
            : `on ${formatDaysOfWeekPhrase(getSelectedDays())}`;
        return {
            headline: `${name} ${formatDosePhrase(dose, unit)} · ${cadence}`,
            bullets: [
                `Starting ${formatShortDate(start)}`,
                throughBullet,
                alertBullet
            ].filter(Boolean)
        };
    }

    /** Fallback when an older saved schedule has no structured summary. */
    function derivePlanSummaryFromEvents(sched) {
        const events = (sched.events || [])
            .map((ev) => ({ ...ev, date: new Date(ev.date) }))
            .filter((ev) => !Number.isNaN(ev.date.getTime()))
            .sort((a, b) => a.date - b.date);
        if (!events.length) {
            return { headline: `${sched.name} — see calendar attachment for dose times.`, bullets: [] };
        }

        const unit = sched.unit || 'mg';
        const first = events[0];
        const last = events[events.length - 1];
        const doses = [];
        events.forEach((ev) => {
            const d = Number(ev.dose);
            if (!Number.isFinite(d)) return;
            if (!doses.length || doses[doses.length - 1] !== d) doses.push(d);
        });

        const dayGaps = [];
        for (let i = 1; i < Math.min(events.length, 12); i++) {
            const gap = Math.round((events[i].date - events[i - 1].date) / 86400000);
            if (gap > 0) dayGaps.push(gap);
        }
        const avgGap = dayGaps.length
            ? dayGaps.reduce((a, b) => a + b, 0) / dayGaps.length
            : null;

        const dowCounts = {};
        events.forEach((ev) => {
            const d = ev.date.getDay();
            dowCounts[d] = (dowCounts[d] || 0) + 1;
        });
        const activeDays = Object.keys(dowCounts).map(Number).sort((a, b) => a - b);

        let cadence = 'on a set calendar schedule';
        if (avgGap != null && avgGap >= 1.5) {
            const rounded = Math.round(avgGap);
            cadence = `every ${rounded} day${rounded === 1 ? '' : 's'}`;
        } else if (activeDays.length && activeDays.length < 7) {
            cadence = `on ${formatDaysOfWeekPhrase(activeDays)}`;
        }

        if (doses.length > 1) {
            const phases = dosePhaseStarts(events);
            return {
                headline: `${sched.name} · ${cadence}`,
                bullets: [
                    ...phases.map((phase, i) => (
                        i === 0
                            ? `${formatDosePhrase(phase.dose, unit)} starting ${formatShortDate(phase.date)}`
                            : `${formatDosePhrase(phase.dose, unit)} from ${formatShortDate(phase.date)}`
                    )),
                    `Through ${formatShortDate(last.date)}`
                ]
            };
        }

        const dosePart = formatDosePhrase(doses[0] != null ? doses[0] : first.dose, unit);
        return {
            headline: `${sched.name} ${dosePart} · ${cadence}`,
            bullets: [
                `Starting ${formatShortDate(first.date)}`,
                `Through ${formatShortDate(last.date)}`
            ]
        };
    }

    function scheduleOverview(sched) {
        const raw = sched.summary;
        if (raw && typeof raw === 'object' && raw.headline) {
            return {
                headline: String(raw.headline).trim(),
                bullets: Array.isArray(raw.bullets) ? raw.bullets.map(String).filter(Boolean) : []
            };
        }
        // Old string summaries / missing summaries: rebuild from events when possible
        const derived = derivePlanSummaryFromEvents(sched);
        if (derived.bullets.length > 1) return derived;
        if (typeof raw === 'string' && raw.trim()) {
            return { headline: raw.trim(), bullets: [] };
        }
        return derived;
    }

    function overviewToHtml(overview, { email = false } = {}) {
        const headline = escapeHtml(overview.headline || '');
        const bullets = overview.bullets || [];
        if (!bullets.length) {
            return email
                ? `<p style="margin:0;font-size:15px;color:#1c2a24;line-height:1.55;">${headline}</p>`
                : `<p class="sched-overview">${headline}</p>`;
        }
        const items = bullets.map((b) => (
            email
                ? `<li style="margin:0 0 4px 0;">${escapeHtml(b)}</li>`
                : `<li>${escapeHtml(b)}</li>`
        )).join('');
        if (email) {
            return `
                <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#1c2a24;line-height:1.4;">${headline}</p>
                <ul style="margin:0;padding-left:18px;font-size:14px;color:#1c2a24;line-height:1.45;">${items}</ul>`;
        }
        return `
            <p class="sched-overview">${headline}</p>
            <ul class="sched-bullets">${items}</ul>`;
    }

    function collectEventsFromForm(peptide) {
        const start = parseDateInput($('#pf-start')?.value);
        if (!start) throw new Error('Start date required');
        const times = getSelectedTimes();

        if (peptide.titration) {
            const followTitration = $('#pf-follow-titration')?.checked !== false;
            const stop = parseDateInput($('#pf-stop')?.value);

            if (followTitration) {
                const currentDose = parseFloat($('#pf-current').value);
                const dosesAlreadyTaken = parseInt($('#pf-taken').value, 10) || 0;
                const targetDose = parseFloat($('#pf-target').value);
                const intervalDays = getIntervalDays(peptide.defaultIntervalDays || 7);
                if (!(currentDose >= 0) || !(targetDose > 0)) throw new Error('Check titration doses');
                if (targetDose < currentDose) throw new Error('Target dose should be ≥ current dose');
                const dayEvents = buildRetaEvents({
                    currentDose,
                    dosesAlreadyTaken,
                    targetDose,
                    startDate: start,
                    stopDate: stop,
                    intervalDays,
                    steps: getRetaTitrationSteps()
                });
                return expandEventsWithTimes(dayEvents, times, peptide.unit);
            }

            // Fixed Reta — no titration
            const dose = parseFloat($('#pf-dose').value);
            if (!(dose > 0)) throw new Error('Enter a dose');
            const mode = getScheduleMode();
            let dayEvents;
            if (mode === 'interval') {
                dayEvents = buildIntervalEvents({
                    dose,
                    startDate: start,
                    stopDate: stop || addDays(start, 180),
                    intervalDays: getIntervalDays(peptide.defaultIntervalDays || 7)
                });
            } else {
                dayEvents = buildFixedEvents({
                    dose,
                    startDate: start,
                    stopDate: stop || addDays(start, 180),
                    daysOfWeek: getSelectedDays()
                });
            }
            return expandEventsWithTimes(dayEvents, times, peptide.unit);
        }

        if (peptide.prn) {
            const dose = parseFloat($('#pf-dose').value);
            const dayEvents = [{ date: start, dose, label: `${dose} ${peptide.unit}` }];
            return expandEventsWithTimes(dayEvents, times, peptide.unit);
        }

        const dose = parseFloat($('#pf-dose').value);
        const stop = parseDateInput($('#pf-stop')?.value);
        const mode = getScheduleMode();
        let dayEvents;
        if (mode === 'interval') {
            dayEvents = buildIntervalEvents({
                dose,
                startDate: start,
                stopDate: stop,
                intervalDays: getIntervalDays(7)
            });
        } else {
            dayEvents = buildFixedEvents({
                dose,
                startDate: start,
                stopDate: stop,
                daysOfWeek: getSelectedDays()
            });
        }
        return expandEventsWithTimes(dayEvents, times, peptide.unit);
    }

    function renderScheduleList(schedules) {
        const list = $('#planner-schedule-list');
        if (!schedules.length) {
            list.innerHTML = '<p class="hint">No schedules yet. Add a peptide course above.</p>';
            return;
        }

        list.innerHTML = schedules.map((s, idx) => `
            <article class="sched-card" style="--swatch:${COLORS[idx % COLORS.length]}">
                <div class="sched-top">
                    <strong>${s.name}</strong>
                    <button type="button" data-remove="${s.id}" class="text-btn">Remove</button>
                </div>
                ${overviewToHtml(scheduleOverview(s))}
                <p class="hint">${s.events.length} calendar alert${s.events.length === 1 ? '' : 's'} · ${halfLifeLabel(resolveHalfLifeHours(s))}</p>
            </article>
        `).join('');

        $all('[data-remove]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const next = loadSchedules().filter((s) => s.id !== btn.getAttribute('data-remove'));
                saveSchedules(next);
                refresh();
            });
        });
    }

    function formatAxisNumber(value, unit) {
        if (unit === 'mcg') {
            if (value >= 100) return String(Math.round(value));
            return value >= 10 ? value.toFixed(0) : value.toFixed(1);
        }
        if (value >= 10) return value.toFixed(0);
        if (value >= 1) return value.toFixed(1);
        return value.toFixed(2);
    }

    function drawGraph(schedules) {
        const canvas = $('#planner-graph');
        const empty = $('#planner-graph-empty');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 640;
        const cssH = 280;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        if (!schedules.length || schedules.every((s) => !s.events.length)) {
            if (empty) {
                empty.hidden = false;
                empty.classList.add('is-visible');
            }
            return;
        }
        if (empty) {
            empty.hidden = true;
            empty.classList.remove('is-visible');
        }

        const dayMs = 24 * 3600 * 1000;
        const allEvents = schedules.flatMap((s) => s.events.map((ev) => ({
            ...ev,
            date: new Date(ev.date),
            halfLifeHours: resolveHalfLifeHours(s),
            dose: Number(ev.dose) || 0
        })));

        const tMin = Math.min(...allEvents.map((e) => e.date.getTime()));
        const tMaxEvent = Math.max(...allEvents.map((e) => e.date.getTime()));

        // Prefer a readable window: through early maintenance, not 6+ months of the same sawtooth.
        let firstMaintain = null;
        allEvents.forEach((ev) => {
            if (String(ev.label || '').includes('maintain')) {
                const t = ev.date.getTime();
                if (firstMaintain == null || t < firstMaintain) firstMaintain = t;
            }
        });
        const tGraphMax = firstMaintain != null
            ? Math.min(tMaxEvent + 14 * dayMs, firstMaintain + 10 * 7 * dayMs)
            : Math.min(tMaxEvent + 14 * dayMs, tMin + 18 * 7 * dayMs);

        const hoursSpan = Math.max(24, (tGraphMax - tMin) / 3600000);
        const doseTimes = allEvents
            .map((e) => (e.date.getTime() - tMin) / 3600000)
            .filter((t) => t <= hoursSpan);
        const sampleHours = buildSampleHours(hoursSpan, doseTimes);
        const samples = sampleHours.length;

        const series = schedules.map((s, idx) => {
            const hl = resolveHalfLifeHours(s);
            const evs = s.events.map((ev) => ({
                dose: Number(ev.dose) || 0,
                t0Hours: (new Date(ev.date).getTime() - tMin) / 3600000
            }));
            const values = relativeConcentration(evs, hl, sampleHours);
            return { name: s.name, unit: s.unit || 'mg', color: COLORS[idx % COLORS.length], values, halfLifeHours: hl };
        });

        const peak = Math.max(...series.flatMap((s) => s.values), 0.0001);
        const axisUnit = series.length === 1 ? series[0].unit : 'dose units';
        const pad = { l: 52, r: 12, t: 22, b: 30 };
        const w = cssW - pad.l - pad.r;
        const h = cssH - pad.t - pad.b;

        ctx.strokeStyle = 'rgba(28,42,36,0.12)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#5c6f66';
        ctx.font = '11px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= 4; i++) {
            const frac = i / 4;
            const y = pad.t + h - frac * h;
            const value = peak * frac;
            ctx.beginPath();
            ctx.moveTo(pad.l, y);
            ctx.lineTo(pad.l + w, y);
            ctx.stroke();
            ctx.fillText(formatAxisNumber(value, axisUnit === 'dose units' ? 'mg' : axisUnit), pad.l - 8, y);
        }

        series.forEach((s) => {
            ctx.beginPath();
            s.values.forEach((v, i) => {
                const x = pad.l + (sampleHours[i] / hoursSpan) * w;
                const y = pad.t + h - (v / peak) * h;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 2.25;
            ctx.stroke();
        });

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#5c6f66';
        ctx.font = '12px Outfit, sans-serif';
        ctx.fillText(`Estimated amount still around (${axisUnit})`, pad.l, 14);
        ctx.fillText('Start', pad.l, cssH - 8);
        ctx.fillText('→ time', pad.l + w - 40, cssH - 8);

        ctx.save();
        ctx.translate(12, pad.t + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(axisUnit, 0, 0);
        ctx.restore();

        const legend = $('#planner-legend');
        legend.innerHTML = series.map((s) => `<span class="legend-item"><i style="background:${s.color}"></i>${s.name} (${s.unit})</span>`).join('');
    }

    function refresh() {
        const schedules = loadSchedules().map((s, idx) => ({
            ...s,
            color: COLORS[idx % COLORS.length],
            events: s.events.map((ev) => ({ ...ev, date: new Date(ev.date) }))
        }));
        renderScheduleList(schedules);
        drawGraph(schedules);
        $('#planner-export').disabled = schedules.length === 0;
        const emailBtn = $('#planner-email');
        if (emailBtn) emailBtn.disabled = schedules.length === 0;
    }

    let initialized = false;

    function init() {
        const select = $('#planner-peptide');
        if (!select) return;
        if (initialized) {
            refresh();
            return;
        }
        initialized = true;

        bindNumberInputGuards(document.getElementById('view-planner') || document);

        select.innerHTML = PEPTIDES.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')
            + '<option value="custom">Custom peptide…</option>';

        const sync = () => {
            const id = select.value;
            if (id === 'custom') {
                $('#planner-peptide-note').textContent = 'Type any name — useful for Semax, MT2, or anything else in your stack.';
                renderFormFields({ id: 'custom', unit: 'mg', defaultTimesPerDay: 1, defaultTimes: ['09:00'], defaultDays: [0, 1, 2, 3, 4, 5, 6] });
                setCustomVisible(true);
                return;
            }
            const peptide = peptideById(id);
            $('#planner-peptide-note').textContent = peptide?.note || '';
            renderFormFields(peptide);
        };
        select.addEventListener('change', sync);
        sync();

        $('#planner-add')?.addEventListener('click', () => {
            try {
                const peptide = resolvePeptideSelection();
                const events = collectEventsFromForm(peptide);
                if (!events.length) throw new Error('No events generated — check dates and days of week');

                const summary = collectPlanSummaryFromForm(peptide, events);
                const schedules = loadSchedules();
                schedules.push({
                    id: `${peptide.id}-${Date.now()}`,
                    peptideId: peptide.id,
                    name: peptide.name,
                    unit: peptide.unit,
                    halfLifeHours: peptide.halfLifeHours,
                    custom: !!peptide.custom,
                    page: peptide.custom ? null : (peptide.page || null),
                    pageUrl: peptide.custom
                        ? PLANNER_URL
                        : (peptide.page ? `${PEPTIDE_BASE_URL}${peptide.page}` : PLANNER_URL),
                    summary,
                    events: events.map((ev) => ({
                        date: ev.date.toISOString(),
                        dose: ev.dose,
                        label: ev.label
                    }))
                });
                saveSchedules(schedules);
                refresh();
                document.getElementById('planner-schedule-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (err) {
                alert(err.message || String(err));
            }
        });

        $('#planner-clear')?.addEventListener('click', () => {
            if (confirm('Clear all saved schedules on this device?')) {
                saveSchedules([]);
                refresh();
            }
        });

        $('#planner-export')?.addEventListener('click', () => {
            const schedules = loadSchedules().map((s) => ({
                ...s,
                events: s.events.map((ev) => ({ ...ev, date: new Date(ev.date) }))
            }));
            if (!schedules.length) return;
            const ics = buildIcs(schedules);
            downloadText('peptide-schedule.ics', ics, 'text/calendar;charset=utf-8');
        });

        $('#planner-email')?.addEventListener('click', () => {
            openScheduleEmailModal();
        });

        window.addEventListener('resize', () => refresh());
        refresh();
    }

    // ——— Email schedule (.ics + HTML body + chart) via Apps Script ———
    const SCHEDULE_EMAIL_WEB_APP_URL =
        'https://script.google.com/macros/s/AKfycbzVCehcIu4ZBFthpBpp3J4oiCtismzABk-oafrzPtXysaZn_RDjupSf7lbouQvKMEl-/exec';

    let scheduleEmailUiReady = false;

    function ensureScheduleEmailUi() {
        if (scheduleEmailUiReady) return;
        scheduleEmailUiReady = true;

        const style = document.createElement('style');
        style.textContent = `
            .sched-email-overlay {
                position: fixed; inset: 0; z-index: 10002;
                display: none; align-items: center; justify-content: center;
                background: rgba(28, 42, 36, 0.45); backdrop-filter: blur(4px);
                opacity: 0; transition: opacity 0.25s ease;
            }
            .sched-email-overlay.active { opacity: 1; }
            .sched-email-card {
                width: min(440px, calc(100% - 32px));
                background: #fff;
                border: 1px solid var(--line, rgba(28,42,36,0.12));
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 12px 40px rgba(28,42,36,0.18);
                font-family: Outfit, system-ui, sans-serif;
                color: var(--ink, #1c2a24);
            }
            .sched-email-card h3 { margin: 0 0 8px; font-family: Fraunces, Georgia, serif; font-size: 1.25rem; }
            .sched-email-card .hint { margin: 0 0 14px; }
            .sched-email-field { margin-bottom: 12px; }
            .sched-email-field label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--muted, #5c6f66); margin-bottom: 6px; }
            .sched-email-field input {
                width: 100%; box-sizing: border-box; border: 1px solid var(--line, #d5ddd8);
                border-radius: 10px; padding: 10px 12px; font: inherit; color: inherit;
            }
            .sched-email-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
            .sched-email-status { min-height: 1.2em; margin-top: 10px; font-size: 0.88rem; text-align: center; font-weight: 500; }
        `;
        document.head.appendChild(style);

        let frame = document.getElementById('schedule-email-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'schedule-email-frame';
            frame.name = 'schedule-email-frame';
            frame.title = 'Schedule email relay';
            frame.style.display = 'none';
            document.body.appendChild(frame);
        }

        const overlay = document.createElement('div');
        overlay.className = 'sched-email-overlay';
        overlay.id = 'sched-email-overlay';
        overlay.innerHTML = `
            <div class="sched-email-card" role="dialog" aria-labelledby="sched-email-title">
                <h3 id="sched-email-title">Email schedule</h3>
                <p class="hint">Sends your schedule summary, half-life chart, and an attached <strong>.ics</strong> calendar file you can import for dose alerts.</p>
                <div class="sched-email-field">
                    <label for="sched-email-to">Email address</label>
                    <input type="email" id="sched-email-to" placeholder="you@example.com" autocomplete="email">
                </div>
                <div class="sched-email-field">
                    <label for="sched-email-subject">Subject</label>
                    <input type="text" id="sched-email-subject" value="Peptide Info — dose schedule (.ics)">
                </div>
                <div class="sched-email-status" id="sched-email-status"></div>
                <div class="sched-email-actions">
                    <button type="button" class="btn" id="sched-email-cancel">Cancel</button>
                    <button type="button" class="btn primary" id="sched-email-send">Send</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => {
            overlay.classList.remove('active');
            setTimeout(() => { overlay.style.display = 'none'; }, 250);
            const sendBtn = document.getElementById('sched-email-send');
            if (sendBtn) sendBtn.disabled = false;
            const status = document.getElementById('sched-email-status');
            if (status) status.textContent = '';
        };

        document.getElementById('sched-email-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        document.getElementById('sched-email-send').addEventListener('click', () => {
            sendScheduleEmail(close);
        });
    }

    function openScheduleEmailModal() {
        const schedules = loadSchedules();
        if (!schedules.length) return;
        ensureScheduleEmailUi();
        const overlay = document.getElementById('sched-email-overlay');
        overlay.style.display = 'flex';
        requestAnimationFrame(() => overlay.classList.add('active'));
        document.getElementById('sched-email-to')?.focus();
    }

    function buildScheduleSummaryHtml(schedules) {
        const blocks = schedules.map((s) => {
            const overview = scheduleOverview(s);
            const count = (s.events || []).length;
            return `
                <div style="margin:0 0 14px 0;padding:14px 16px;border-left:4px solid #0f7a5f;background:#f3f6f2;border-radius:8px;">
                    ${overviewToHtml(overview, { email: true })}
                    <p style="margin:10px 0 0 0;font-size:12px;color:#5c6f66;">${count} calendar alert${count === 1 ? '' : 's'} in the attached .ics</p>
                </div>`;
        }).join('');

        return `
            <div style="font-family:Arial,Helvetica,sans-serif;color:#1c2a24;line-height:1.5;max-width:640px;">
                <h1 style="margin:0 0 8px 0;font-family:Georgia,serif;font-size:24px;color:#1c2a24;">Your peptide dose schedule</h1>
                <p style="margin:0 0 16px 0;font-size:14px;color:#5c6f66;">
                    Attached is a calendar file (<strong>peptide-schedule.ics</strong>). Open it in Google Calendar, Apple Calendar, or Outlook to add alerts for each dose.
                </p>
                <p style="margin:0 0 20px 0;font-size:13px;">
                    <a href="${PLANNER_URL}" style="color:#0f7a5f;">Open Schedule planner</a>
                </p>
                <h2 style="margin:0 0 12px 0;font-family:Georgia,serif;font-size:18px;border-bottom:1px solid #d5ddd8;padding-bottom:6px;">Plan overview</h2>
                ${blocks}
                <h2 style="margin:24px 0 12px 0;font-family:Georgia,serif;font-size:18px;border-bottom:1px solid #d5ddd8;padding-bottom:6px;">Estimated amount still around</h2>
                <p style="margin:0 0 12px 0;font-size:13px;color:#5c6f66;">Educational half-life sketch only — not lab pharmacokinetics.</p>
                <img src="cid:halflifeChart" alt="Half-life concentration chart" style="max-width:100%;height:auto;border:1px solid #d5ddd8;border-radius:12px;background:#fff;" />
            </div>`;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getChartPngBase64() {
        const source = $('#planner-graph');
        if (!source) return '';
        try {
            // Export a small JPEG for email — full retina PNG often crashes Apps Script POST
            const w = Math.min(640, source.clientWidth || 640);
            const h = 260;
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(source, 0, 0, source.width, source.height, 0, 0, w, h);
            const dataUrl = off.toDataURL('image/jpeg', 0.72);
            const parts = dataUrl.split(',');
            return parts.length > 1 ? parts[1] : '';
        } catch (err) {
            console.warn('Could not export chart', err);
            return '';
        }
    }

    function sendScheduleEmail(onDone) {
        const emailInput = document.getElementById('sched-email-to')?.value?.trim() || '';
        const subjectInput = document.getElementById('sched-email-subject')?.value?.trim()
            || 'Peptide Info - dose schedule (.ics)';
        const status = document.getElementById('sched-email-status');
        const sendBtn = document.getElementById('sched-email-send');

        if (!emailInput.includes('@')) {
            if (status) {
                status.style.color = '#9b1c28';
                status.textContent = 'Enter a valid email address.';
            }
            return;
        }

        const schedules = loadSchedules().map((s) => ({
            ...s,
            events: s.events.map((ev) => ({ ...ev, date: new Date(ev.date) }))
        }));
        if (!schedules.length) return;

        drawGraph(schedules);

        const ics = buildIcs(schedules);
        const scheduleHtml = buildScheduleSummaryHtml(schedules);
        let chartBase64 = getChartPngBase64();

        // Keep Apps Script POST well under size limits
        const MAX_CHART = 180000;
        if (chartBase64.length > MAX_CHART) {
            console.warn('Chart too large for email relay, omitting chart', chartBase64.length);
            chartBase64 = '';
        }

        if (sendBtn) sendBtn.disabled = true;
        if (status) {
            status.style.color = '#0f7a5f';
            status.textContent = 'Sending schedule email…';
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCHEDULE_EMAIL_WEB_APP_URL;
        form.target = 'schedule-email-frame';
        form.style.display = 'none';

        const fields = {
            action: 'schedule',
            email: emailInput,
            subject: subjectInput,
            scheduleHtml,
            chartBase64,
            icsContent: ics
        };

        Object.keys(fields).forEach((name) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = fields[name];
            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        form.remove();

        if (status) {
            status.style.color = '#0f7a5f';
            status.textContent = 'Sent — check inbox (and spam) for the .ics attachment.';
        }
        setTimeout(() => {
            if (typeof onDone === 'function') onDone();
        }, 1600);
    }

    window.PeptideSchedulePlanner = { init, PEPTIDES };
})();
