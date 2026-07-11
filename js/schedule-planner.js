/**
 * Dose schedule planner: titration (Reta), half-life curve, ICS calendar export.
 * Educational relative model only — not pharmacokinetic advice.
 */
(function () {
    const STORAGE_KEY = 'peptideInfoSchedules.v1';

    const PEPTIDES = [
        {
            id: 'reta',
            name: 'Retatrutide',
            halfLifeHours: 150,
            defaultIntervalDays: 7,
            unit: 'mg',
            titration: true,
            note: 'Weekly · ~6–7 day half-life'
        },
        {
            id: 'tesa',
            name: 'Tesamorelin',
            halfLifeHours: 12,
            defaultIntervalDays: 1,
            unit: 'mg',
            note: 'Daily (5 on / 2 off common) · short effective window'
        },
        {
            id: 'cjc',
            name: 'CJC / Ipamorelin',
            halfLifeHours: 2,
            defaultIntervalDays: 1,
            unit: 'mcg',
            note: '1–2× daily · short pulse'
        },
        {
            id: 'bpc',
            name: 'BPC-157',
            halfLifeHours: 4,
            defaultIntervalDays: 1,
            unit: 'mcg',
            note: '1–2× daily'
        },
        {
            id: 'ghk',
            name: 'GHK-Cu',
            halfLifeHours: 6,
            defaultIntervalDays: 1,
            unit: 'mg',
            note: 'Daily Sub-Q'
        },
        {
            id: 'selank',
            name: 'Selank',
            halfLifeHours: 3,
            defaultIntervalDays: 1,
            unit: 'mcg',
            note: 'Nasal 1–2× daily'
        },
        {
            id: 'pt141',
            name: 'PT-141',
            halfLifeHours: 2.5,
            defaultIntervalDays: 0,
            unit: 'mg',
            prn: true,
            note: 'PRN only · max 1× / 24h'
        }
    ];

    const COLORS = ['#0f7a5f', '#3557a0', '#7a5a1e', '#8b3a4a', '#2f6f6a', '#5c4d8a', '#3d6b3d'];

    function $(sel, root = document) { return root.querySelector(sel); }
    function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

    function parseDateInput(value) {
        if (!value) return null;
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d, 9, 0, 0, 0);
    }

    function formatDateInput(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
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

    function buildFixedEvents({ dose, intervalDays, startDate, stopDate, skipWeekends, fiveOnTwoOff }) {
        const events = [];
        if (!intervalDays || intervalDays <= 0) return events;

        let cursor = new Date(startDate.getTime());
        const end = stopDate || addDays(startDate, 90);
        let dayIndex = 0;

        while (cursor <= end) {
            let take = true;
            if (fiveOnTwoOff) {
                const cycleDay = dayIndex % 7;
                take = cycleDay < 5;
            } else if (skipWeekends) {
                const dow = cursor.getDay();
                take = dow !== 0 && dow !== 6;
            }

            if (take) {
                events.push({ date: new Date(cursor), dose, label: String(dose) });
            }

            cursor = addDays(cursor, fiveOnTwoOff ? 1 : intervalDays);
            dayIndex += fiveOnTwoOff ? 1 : intervalDays;
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

    function renderFormFields(peptide) {
        const wrap = $('#planner-fields');
        const today = formatDateInput(new Date());

        if (peptide.titration) {
            wrap.innerHTML = `
                <label class="field"><span>Current dose (mg)</span><input type="number" id="pf-current" value="4" min="0" step="0.5"></label>
                <label class="field"><span>Doses already taken at this dose</span><input type="number" id="pf-taken" value="2" min="0" step="1"></label>
                <label class="field"><span>Target dose (mg)</span><input type="number" id="pf-target" value="10" min="0" step="0.5"></label>
                <label class="field"><span>Start date (next dose)</span><input type="date" id="pf-start" value="${today}"></label>
                <label class="field"><span>Stop date (optional)</span><input type="date" id="pf-stop"></label>
                <p class="hint">Titration: finish a 4-dose block at the current dose, then +2 mg every 4 weekly doses until target, then maintain.</p>
            `;
            return;
        }

        if (peptide.prn) {
            wrap.innerHTML = `
                <label class="field"><span>Dose (${peptide.unit})</span><input type="number" id="pf-dose" value="1" min="0" step="0.1"></label>
                <label class="field"><span>Event date</span><input type="date" id="pf-start" value="${today}"></label>
                <p class="hint">PRN peptide — adds a single calendar reminder (not a repeating course).</p>
            `;
            return;
        }

        const isTesa = peptide.id === 'tesa';
        wrap.innerHTML = `
            <label class="field"><span>Dose (${peptide.unit})</span><input type="number" id="pf-dose" value="${peptide.unit === 'mg' ? 2 : 250}" min="0" step="any"></label>
            <label class="field"><span>Every (days)</span><input type="number" id="pf-interval" value="${peptide.defaultIntervalDays}" min="1" step="1" ${isTesa ? 'disabled' : ''}></label>
            <label class="field checkbox"><input type="checkbox" id="pf-5on2" ${isTesa ? 'checked' : ''}><span>5 days on / 2 days off</span></label>
            <label class="field"><span>Start date</span><input type="date" id="pf-start" value="${today}"></label>
            <label class="field"><span>Stop date</span><input type="date" id="pf-stop" value="${formatDateInput(addDays(new Date(), 84))}"></label>
        `;

        const five = $('#pf-5on2');
        const interval = $('#pf-interval');
        if (five && interval) {
            five.addEventListener('change', () => {
                interval.disabled = five.checked;
            });
            interval.disabled = five.checked;
        }
    }

    function collectEventsFromForm(peptide) {
        const start = parseDateInput($('#pf-start')?.value);
        if (!start) throw new Error('Start date required');

        if (peptide.titration) {
            const currentDose = parseFloat($('#pf-current').value);
            const dosesAlreadyTaken = parseInt($('#pf-taken').value, 10) || 0;
            const targetDose = parseFloat($('#pf-target').value);
            const stop = parseDateInput($('#pf-stop')?.value);
            if (!(currentDose >= 0) || !(targetDose > 0)) throw new Error('Check titration doses');
            if (targetDose < currentDose) throw new Error('Target dose should be ≥ current dose');
            return buildRetaEvents({ currentDose, dosesAlreadyTaken, targetDose, startDate: start, stopDate: stop });
        }

        if (peptide.prn) {
            const dose = parseFloat($('#pf-dose').value);
            return [{ date: start, dose, label: `${dose} ${peptide.unit}` }];
        }

        const dose = parseFloat($('#pf-dose').value);
        const fiveOnTwoOff = $('#pf-5on2')?.checked;
        const intervalDays = fiveOnTwoOff ? 1 : (parseFloat($('#pf-interval').value) || 1);
        const stop = parseDateInput($('#pf-stop')?.value);
        return buildFixedEvents({ dose, intervalDays, startDate: start, stopDate: stop, fiveOnTwoOff });
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
                <p class="hint">${s.events.length} dose event${s.events.length === 1 ? '' : 's'} · t½ ≈ ${s.halfLifeHours}h</p>
                <ol class="sched-preview">
                    ${s.events.slice(0, 8).map((ev) => `<li>${formatDateInput(new Date(ev.date))} — ${ev.label}</li>`).join('')}
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

    function drawGraph(schedules) {
        const canvas = $('#planner-graph');
        const empty = $('#planner-graph-empty');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth || 640;
        const cssH = 260;
        canvas.width = Math.floor(cssW * dpr);
        canvas.height = Math.floor(cssH * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        if (!schedules.length || schedules.every((s) => !s.events.length)) {
            empty.hidden = false;
            return;
        }
        empty.hidden = true;

        const allEvents = schedules.flatMap((s) => s.events.map((ev) => ({
            ...ev,
            date: new Date(ev.date),
            halfLifeHours: s.halfLifeHours,
            color: s.color,
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
            return { name: s.name, color: COLORS[idx % COLORS.length], values };
        });

        const peak = Math.max(...series.flatMap((s) => s.values), 0.0001);
        const pad = { l: 36, r: 12, t: 16, b: 28 };
        const w = cssW - pad.l - pad.r;
        const h = cssH - pad.t - pad.b;

        ctx.strokeStyle = 'rgba(28,42,36,0.12)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = pad.t + (h * i) / 4;
            ctx.beginPath();
            ctx.moveTo(pad.l, y);
            ctx.lineTo(pad.l + w, y);
            ctx.stroke();
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

        ctx.fillStyle = '#5c6f66';
        ctx.font = '12px Outfit, sans-serif';
        ctx.fillText('Relative amount in system (superposition of doses)', pad.l, 12);
        ctx.fillText('Start', pad.l, cssH - 8);
        ctx.fillText('→ time', pad.l + w - 40, cssH - 8);

        const legend = $('#planner-legend');
        legend.innerHTML = series.map((s) => `<span class="legend-item"><i style="background:${s.color}"></i>${s.name}</span>`).join('');
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

        select.innerHTML = PEPTIDES.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');

        const sync = () => {
            const peptide = peptideById(select.value);
            $('#planner-peptide-note').textContent = peptide?.note || '';
            renderFormFields(peptide);
        };
        select.addEventListener('change', sync);
        sync();

        $('#planner-add')?.addEventListener('click', () => {
            try {
                const peptide = peptideById(select.value);
                const events = collectEventsFromForm(peptide);
                if (!events.length) throw new Error('No events generated — check dates / interval');

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
