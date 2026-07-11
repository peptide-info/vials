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
            halfLifeHours: 150,
            defaultIntervalDays: 7,
            unit: 'mg',
            titration: true,
            defaultTimesPerDay: 1,
            defaultTimes: ['09:00'],
            note: 'Weekly · graph uses ~6–7 day half-life'
        },
        {
            id: 'tesa',
            name: 'Tesamorelin',
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
            halfLifeHours: 6,
            defaultIntervalDays: 1,
            unit: 'mg',
            defaultTimesPerDay: 1,
            defaultTimes: ['09:00'],
            note: 'Daily Sub-Q'
        },
        {
            id: 'selank',
            name: 'Selank',
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
     * Retatrutide titration:
     * Finish current step (4 doses/weeks total at current dose), then +2 mg every 4 weeks until target, then maintain.
     */
    function buildRetaEvents({
        currentDose,
        dosesAlreadyTaken,
        targetDose,
        startDate,
        stopDate,
        stepMg = 2,
        dosesPerStep = 4,
        maintainWeeks = 26
    }) {
        const events = [];
        let cursor = new Date(startDate.getTime());
        const endCap = stopDate || addDays(startDate, maintainWeeks * 7 + 200);

        const remainingAtCurrent = Math.max(0, dosesPerStep - Math.max(0, dosesAlreadyTaken));
        for (let i = 0; i < remainingAtCurrent; i++) {
            if (cursor > endCap) break;
            events.push({ date: new Date(cursor), dose: currentDose, label: `${currentDose} mg` });
            cursor = addDays(cursor, 7);
        }

        let stepDose = Math.ceil((currentDose + 0.0001) / stepMg) * stepMg;
        if (stepDose <= currentDose) stepDose = currentDose + stepMg;

        while (stepDose < targetDose - 0.0001) {
            for (let i = 0; i < dosesPerStep; i++) {
                if (cursor > endCap) return events;
                events.push({ date: new Date(cursor), dose: stepDose, label: `${stepDose} mg` });
                cursor = addDays(cursor, 7);
            }
            stepDose += stepMg;
        }

        const maintainUntil = stopDate || addDays(cursor, maintainWeeks * 7);
        while (cursor <= maintainUntil && cursor <= endCap) {
            events.push({ date: new Date(cursor), dose: targetDose, label: `${targetDose} mg (maintain)` });
            cursor = addDays(cursor, 7);
        }

        return events;
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

    function relativeConcentration(events, halfLifeHours, sampleHours) {
        const k = Math.LN2 / halfLifeHours;
        return sampleHours.map((tHours) => {
            let c = 0;
            for (const ev of events) {
                const ageH = (tHours - ev.t0Hours);
                if (ageH >= 0) c += ev.dose * Math.exp(-k * ageH);
            }
            return c;
        });
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
            sched.events.forEach((ev, idx) => {
                const start = ev.date;
                const end = new Date(start.getTime() + 30 * 60 * 1000);
                const uid = `${sched.id}-${idx}-${start.getTime()}@peptide-info`;
                const summary = escapeIcs(`${sched.name}: ${ev.label}`);
                const desc = escapeIcs(`Peptide schedule from Peptide Info planner. Half-life model is relative/educational only.`);

                lines.push('BEGIN:VEVENT');
                lines.push(`UID:${uid}`);
                lines.push(`DTSTAMP:${dtStamp}`);
                lines.push(`DTSTART:${toIcsLocal(start)}`);
                lines.push(`DTEND:${toIcsLocal(end)}`);
                lines.push(`SUMMARY:${summary}`);
                lines.push(`DESCRIPTION:${desc}`);
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

    function timeFieldsHtml(peptide) {
        const count = Math.max(1, peptide.defaultTimesPerDay || 1);
        const defaults = peptide.defaultTimes || ['09:00'];
        const maxTimes = peptide.titration || peptide.prn ? 1 : 4;
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

    function bindTimeFields(peptide) {
        const select = $('#pf-times-per-day');
        if (!select) {
            renderTimeSlots(1, peptide.defaultTimes);
            return;
        }
        const sync = () => {
            const n = Math.max(1, parseInt(select.value, 10) || 1);
            const current = $all('.pf-time-input').map((el) => el.value);
            const defaults = current.length ? current : (peptide.defaultTimes || ['09:00']);
            renderTimeSlots(n, defaults);
        };
        select.addEventListener('change', sync);
        sync();
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
                <input type="number" id="pf-custom-hl" value="24" min="0.5" step="any">
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

    function renderFormFields(peptide) {
        const wrap = $('#planner-fields');
        const today = formatDateInput(new Date());
        const isCustom = peptide?.id === 'custom' || $('#planner-peptide')?.value === 'custom';

        if (peptide?.titration) {
            wrap.innerHTML = `
                <label class="field"><span>Current dose (mg)</span><input type="number" id="pf-current" value="4" min="0" step="0.5"></label>
                <label class="field"><span>Doses already taken at this dose</span><input type="number" id="pf-taken" value="2" min="0" step="1"></label>
                <label class="field"><span>Target dose (mg)</span><input type="number" id="pf-target" value="10" min="0" step="0.5"></label>
                <label class="field"><span>Start date (next dose)</span><input type="date" id="pf-start" value="${today}"></label>
                <label class="field"><span>Stop date (optional)</span><input type="date" id="pf-stop"></label>
                ${timeFieldsHtml(peptide)}
                <p class="hint field-span">Titration: finish a 4-dose block at the current dose, then +2 mg every 4 weekly doses until target, then maintain.</p>
            `;
            bindTimeFields(peptide);
            return;
        }

        if (peptide?.prn) {
            wrap.innerHTML = `
                <label class="field"><span>Dose (${peptide.unit})</span><input type="number" id="pf-dose" value="1" min="0" step="0.1"></label>
                <label class="field"><span>Event date</span><input type="date" id="pf-start" value="${today}"></label>
                ${timeFieldsHtml(peptide)}
                <p class="hint field-span">PRN peptide — adds a single calendar reminder.</p>
            `;
            bindTimeFields(peptide);
            return;
        }

        // Standard / custom daily-style course
        const unit = isCustom ? 'mg' : peptide.unit;
        const doseDefault = unit === 'mg' ? 2 : 250;
        wrap.innerHTML = `
            ${customFieldsHtml()}
            <label class="field"><span>Dose (<span id="pf-unit-label">${unit}</span>)</span><input type="number" id="pf-dose" value="${doseDefault}" min="0" step="any"></label>
            <label class="field"><span>Start date</span><input type="date" id="pf-start" value="${today}"></label>
            <label class="field"><span>Stop date</span><input type="date" id="pf-stop" value="${formatDateInput(addDays(new Date(), 84))}"></label>
            ${daysOfWeekHtml(isCustom ? { defaultDays: [0, 1, 2, 3, 4, 5, 6] } : peptide)}
            ${timeFieldsHtml(isCustom ? { defaultTimesPerDay: 1, defaultTimes: ['09:00'] } : peptide)}
            <p class="hint field-span">Pick which weekdays count, then set how many alerts you want each of those days.</p>
        `;

        setCustomVisible(isCustom);
        if (isCustom) {
            $('#pf-custom-unit')?.addEventListener('change', (e) => {
                const label = $('#pf-unit-label');
                if (label) label.textContent = e.target.value;
            });
        }
        bindDowPresets();
        bindTimeFields(isCustom ? { defaultTimesPerDay: 1, defaultTimes: ['09:00'] } : peptide);
    }

    function collectEventsFromForm(peptide) {
        const start = parseDateInput($('#pf-start')?.value);
        if (!start) throw new Error('Start date required');
        const times = getSelectedTimes();

        if (peptide.titration) {
            const currentDose = parseFloat($('#pf-current').value);
            const dosesAlreadyTaken = parseInt($('#pf-taken').value, 10) || 0;
            const targetDose = parseFloat($('#pf-target').value);
            const stop = parseDateInput($('#pf-stop')?.value);
            if (!(currentDose >= 0) || !(targetDose > 0)) throw new Error('Check titration doses');
            if (targetDose < currentDose) throw new Error('Target dose should be ≥ current dose');
            const dayEvents = buildRetaEvents({ currentDose, dosesAlreadyTaken, targetDose, startDate: start, stopDate: stop });
            return expandEventsWithTimes(dayEvents, times, peptide.unit);
        }

        if (peptide.prn) {
            const dose = parseFloat($('#pf-dose').value);
            const dayEvents = [{ date: start, dose, label: `${dose} ${peptide.unit}` }];
            return expandEventsWithTimes(dayEvents, times, peptide.unit);
        }

        const dose = parseFloat($('#pf-dose').value);
        const stop = parseDateInput($('#pf-stop')?.value);
        const daysOfWeek = getSelectedDays();
        const dayEvents = buildFixedEvents({ dose, startDate: start, stopDate: stop, daysOfWeek });
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
                <p class="hint">${s.events.length} dose event${s.events.length === 1 ? '' : 's'} · ${halfLifeLabel(s.halfLifeHours)}</p>
                <ol class="sched-preview">
                    ${s.events.slice(0, 8).map((ev) => {
                        const when = new Date(ev.date);
                        return `<li>${formatDisplayDate(when)} · ${formatDisplayTime(when)} — ${ev.label}</li>`;
                    }).join('')}
                    ${s.events.length > 8 ? `<li>… +${s.events.length - 8} more</li>` : ''}
                </ol>
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

        const allEvents = schedules.flatMap((s) => s.events.map((ev) => ({
            ...ev,
            date: new Date(ev.date),
            halfLifeHours: s.halfLifeHours,
            dose: Number(ev.dose) || 0
        })));

        const tMin = Math.min(...allEvents.map((e) => e.date.getTime()));
        const tMaxEvent = Math.max(...allEvents.map((e) => e.date.getTime()));
        const tMax = tMaxEvent + 14 * 24 * 3600 * 1000;
        const hoursSpan = Math.max(24, (tMax - tMin) / 3600000);
        const samples = 240;
        const sampleHours = Array.from({ length: samples }, (_, i) => (i / (samples - 1)) * hoursSpan);

        const series = schedules.map((s, idx) => {
            const evs = s.events.map((ev) => ({
                dose: Number(ev.dose) || 0,
                t0Hours: (new Date(ev.date).getTime() - tMin) / 3600000
            }));
            const values = relativeConcentration(evs, s.halfLifeHours, sampleHours);
            return { name: s.name, unit: s.unit || 'mg', color: COLORS[idx % COLORS.length], values };
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
                const x = pad.l + (i / (samples - 1)) * w;
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

        // Y-axis unit label
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

                const schedules = loadSchedules();
                schedules.push({
                    id: `${peptide.id}-${Date.now()}`,
                    peptideId: peptide.id,
                    name: peptide.name,
                    unit: peptide.unit,
                    halfLifeHours: peptide.halfLifeHours,
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

        window.addEventListener('resize', () => refresh());
        refresh();
    }

    window.PeptideSchedulePlanner = { init, PEPTIDES };
})();
