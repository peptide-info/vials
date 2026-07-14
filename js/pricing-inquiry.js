/**
 * Pricing inquiry tab — password gate via Apps Script + Sheet-backed cart.
 */
(function () {
    const SCRIPT_URL =
        'https://script.google.com/macros/s/AKfycbzVCehcIu4ZBFthpBpp3J4oiCtismzABk-oafrzPtXysaZn_RDjupSf7lbouQvKMEl-/exec';

    const STORAGE_TOKEN = 'pricing.inquiry.token';
    const STORAGE_CART = 'pricing.inquiry.cart';
    const VIALS_PER_BOX = 10;
    const SHIPPING_FLAT = 50;
    const MAX_PEOPLE = 5;
    const ORDER_FILE_VERSION = 1;

    const state = {
        token: sessionStorage.getItem(STORAGE_TOKEN) || '',
        products: [],
        qty: {},
        people: [{ name: 'Person 1' }],
        splits: {},
        warehouse: 'HK',
        shippingFlat: SHIPPING_FLAT,
        vialsPerBox: VIALS_PER_BOX,
        loaded: false,
        loading: false,
        expandedGroups: new Set()
    };

    function $(id) {
        return document.getElementById(id);
    }

    function money(n) {
        if (!Number.isFinite(n)) return '—';
        return '$' + n.toFixed(2);
    }

    /** Parse vial amount → { qty, unit } from strings like 10mg, 100mcg, 10ml, 5000iu. */
    function parseAmt(product) {
        const raw = String(product.amt || '').toLowerCase().replace(/\s+/g, '');
        const m = raw.match(/^([\d.]+)(mg|mcg|ml|iu|g)$/);
        if (!m) return null;
        const qty = parseFloat(m[1]);
        if (!Number.isFinite(qty) || qty <= 0) return null;
        return { qty, unit: m[2] };
    }

    function unitLabel(unit) {
        if (unit === 'ml') return 'mL';
        if (unit === 'iu') return 'IU';
        if (unit === 'mcg') return 'mcg';
        if (unit === 'mg') return 'mg';
        if (unit === 'g') return 'g';
        return String(unit || '');
    }

    /** $/unit of the vial’s native amount unit (mg, mL, IU, …). */
    function perUnit(product) {
        const parsed = parseAmt(product);
        if (!parsed) return null;
        const rate = product.price / (state.vialsPerBox * parsed.qty);
        if (!Number.isFinite(rate) || rate <= 0) return null;
        return { rate, unit: parsed.unit };
    }

    /** $/mg for the table column — mg/mcg only. */
    function perMg(product) {
        const u = perUnit(product);
        if (!u) return null;
        if (u.unit === 'mg') return u.rate;
        if (u.unit === 'mcg') return u.rate * 1000; // $/mcg → $/mg
        return null;
    }

    function weekTip(product, unitInfo) {
        const min = product.minMgWeek;
        const max = product.maxMgWeek;
        const notes = String(product.notes || '').trim();
        let costLine = '';
        if (unitInfo && (Number.isFinite(min) || Number.isFinite(max))) {
            const u = unitLabel(unitInfo.unit);
            const rate = unitInfo.rate;
            if (Number.isFinite(min) && Number.isFinite(max)) {
                costLine = `Est. $/week: ${money(rate * min)}–${money(rate * max)} (${min}–${max} ${u}/week)`;
            } else if (Number.isFinite(min)) {
                costLine = `Est. $/week: ~${money(rate * min)} (from ${min} ${u}/week)`;
            } else {
                costLine = `Est. $/week: ~${money(rate * max)} (from ${max} ${u}/week)`;
            }
        }
        if (costLine && notes) return `${notes}\n${costLine}`;
        return costLine || notes;
    }

    function isUnlocked() {
        return Boolean(state.token);
    }

    function setTabLocked(locked) {
        const tab = $('pricing-tab');
        if (!tab) return;
        tab.classList.toggle('is-locked', locked);
        tab.setAttribute('aria-label', locked
            ? 'Pricing inquiry (locked)'
            : 'Pricing inquiry');
        const icon = tab.querySelector('.lock-icon');
        if (icon) icon.hidden = !locked;
    }

    function persistCart() {
        try {
            sessionStorage.setItem(STORAGE_CART, JSON.stringify({
                qty: state.qty,
                people: state.people,
                splits: state.splits
            }));
        } catch (ignore) {}
    }

    function restoreCart() {
        try {
            const raw = sessionStorage.getItem(STORAGE_CART);
            if (!raw) return;
            applyCartPayload(JSON.parse(raw));
        } catch (ignore) {}
    }

    function applyCartPayload(data) {
        if (!data || typeof data !== 'object') return;
        if (data.qty && typeof data.qty === 'object') state.qty = data.qty;
        if (Array.isArray(data.people) && data.people.length) {
            state.people = data.people.slice(0, MAX_PEOPLE).map((p, i) => ({
                name: (p && p.name != null ? String(p.name) : '') || `Person ${i + 1}`
            }));
        }
        if (data.splits && typeof data.splits === 'object') state.splits = data.splits;
    }

    function gasRequest(params) {
        const qs = new URLSearchParams(params).toString();
        const url = `${SCRIPT_URL}?${qs}`;

        return fetch(url, { method: 'GET', redirect: 'follow', credentials: 'omit' })
            .then(async (res) => {
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch (err) {
                    if (text && text.length < 300 && /error/i.test(text)) {
                        return { ok: false, error: text.trim() };
                    }
                    return gasJsonp(params);
                }
            })
            .catch(() => gasJsonp(params));
    }

    /** Prefer POST for large payloads (order email). */
    function gasPost(params) {
        const body = new URLSearchParams(params);
        return fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        })
            .then(async (res) => {
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch (err) {
                    if (/success/i.test(text)) return { ok: true };
                    return { ok: false, error: text.slice(0, 200) || 'Request failed' };
                }
            })
            .catch((err) => ({ ok: false, error: String(err.message || err) }));
    }

    function gasJsonp(params) {
        return new Promise((resolve, reject) => {
            const cb = `_pricingCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
            const script = document.createElement('script');
            const t = setTimeout(() => {
                cleanup();
                reject(new Error('Pricing request timed out'));
            }, 25000);

            function cleanup() {
                clearTimeout(t);
                delete window[cb];
                script.remove();
            }

            window[cb] = (data) => {
                cleanup();
                resolve(data);
            };

            const qs = new URLSearchParams({ ...params, callback: cb }).toString();
            script.src = `${SCRIPT_URL}?${qs}`;
            script.onerror = () => {
                cleanup();
                reject(new Error('Pricing request failed'));
            };
            document.head.appendChild(script);
        });
    }

    function promptUnlock() {
        const modal = $('pricing-modal');
        const err = $('pricing-modal-error');
        const input = $('pricing-password');
        if (err) {
            err.hidden = true;
            err.textContent = '';
        }
        if (input) input.value = '';
        if (modal) modal.hidden = false;
        setTimeout(() => input?.focus(), 30);
    }

    function closeModal() {
        const modal = $('pricing-modal');
        if (modal) modal.hidden = true;
    }

    async function unlock(password) {
        const err = $('pricing-modal-error');
        const submit = $('pricing-modal-submit');
        if (submit) submit.disabled = true;
        try {
            const data = await gasRequest({
                action: 'pricingUnlock',
                password: String(password || '').trim()
            });
            if (!data || !data.ok || !data.token) {
                if (err) {
                    err.hidden = false;
                    if (data && data.version && data.ok == null) {
                        err.textContent = `Apps Script is not updated yet (live is ${data.version}). Deploy a New version of EmailSchedule.gs + PricingInquiry.gs.`;
                    } else {
                        err.textContent = (data && data.error) || 'Incorrect password.';
                    }
                }
                return false;
            }
            state.token = data.token;
            state.warehouse = data.warehouse || 'HK';
            state.shippingFlat = Number.isFinite(data.shippingFlat) ? data.shippingFlat : SHIPPING_FLAT;
            state.vialsPerBox = Number.isFinite(data.vialsPerBox) ? data.vialsPerBox : VIALS_PER_BOX;
            sessionStorage.setItem(STORAGE_TOKEN, state.token);
            setTabLocked(false);
            closeModal();
            // Switch tab immediately, then load catalog
            window.showMainView?.('pricing');
            await loadCatalog();
            return true;
        } catch (e) {
            if (err) {
                err.hidden = false;
                err.textContent = 'Could not reach unlock service. Try again after Apps Script redeploy.';
            }
            return false;
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    function lockAgain() {
        state.token = '';
        state.products = [];
        state.loaded = false;
        sessionStorage.removeItem(STORAGE_TOKEN);
        setTabLocked(true);
        const status = $('pricing-load-status');
        const wrap = $('pricing-table-wrap');
        if (status) {
            status.hidden = false;
            status.textContent = 'Locked. Enter the password to view pricing.';
        }
        if (wrap) wrap.hidden = true;
    }

    function clearUnlockOnReload() {
        // sessionStorage survives refresh; drop the token on explicit reload only.
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav && nav.type === 'reload') {
                sessionStorage.removeItem(STORAGE_TOKEN);
                state.token = '';
                state.loaded = false;
                state.products = [];
            }
        } catch (ignore) {}
    }

    async function loadCatalog() {
        if (!state.token || state.loading) return;
        state.loading = true;
        const status = $('pricing-load-status');
        const wrap = $('pricing-table-wrap');
        if (status) {
            status.hidden = false;
            status.textContent = 'Loading catalog…';
        }
        try {
            const data = await gasRequest({ action: 'pricingCatalog', token: state.token });
            if (!data || !data.ok) {
                const msg = (data && data.error) || 'Could not load catalog.';
                if (data && /expired|unlock/i.test(String(data.error || ''))) {
                    if (status) status.textContent = msg;
                    state.token = '';
                    sessionStorage.removeItem(STORAGE_TOKEN);
                    setTabLocked(true);
                    promptUnlock();
                    return;
                }
                if (status) status.textContent = msg;
                return;
            }
            state.products = Array.isArray(data.products) ? data.products : [];
            state.warehouse = data.warehouse || state.warehouse;
            state.shippingFlat = Number.isFinite(data.shippingFlat) ? data.shippingFlat : state.shippingFlat;
            state.vialsPerBox = Number.isFinite(data.vialsPerBox) ? data.vialsPerBox : state.vialsPerBox;
            state.loaded = true;
            ensureSplitsShape();
            renderAll();
            if (status) status.hidden = true;
            if (wrap) wrap.hidden = false;
        } catch (e) {
            if (status) {
                status.textContent = `Could not load catalog (${e && e.message ? e.message : 'network'}). Redeploy Apps Script (New version) if this persists.`;
            }
        } finally {
            state.loading = false;
        }
    }

    function ensureSplitsShape() {
        const n = state.people.length;
        state.products.forEach((p) => {
            const key = p.catNo;
            const boxes = Number(state.qty[key]) || 0;
            const need = boxes * state.vialsPerBox;
            let arr = Array.isArray(state.splits[key]) ? state.splits[key].slice(0, n) : [];
            while (arr.length < n) arr.push(0);
            arr = arr.map((v) => {
                const x = parseInt(v, 10);
                return Number.isFinite(x) && x > 0 ? x : 0;
            });
            if (need > 0 && n === 1 && arr.reduce((a, b) => a + b, 0) === 0) {
                arr[0] = need;
            }
            state.splits[key] = arr;
            if (boxes > 0) normalizeSplits(key);
            else delete state.splits[key];
        });
    }

    function setQty(catNo, boxes) {
        const q = Math.max(0, Math.floor(Number(boxes) || 0));
        if (q === 0) {
            delete state.qty[catNo];
            delete state.splits[catNo];
        } else {
            state.qty[catNo] = q;
            ensureSplitsShape();
            const need = q * state.vialsPerBox;
            const arr = state.splits[catNo] || [];
            const sum = arr.reduce((a, b) => a + b, 0);
            if (state.people.length === 1) {
                state.splits[catNo] = [need];
            } else if (sum === 0) {
                state.splits[catNo] = arr.map(() => 0);
            }
        }
        persistCart();
        renderAll();
    }

    function shippingPeopleIndexes() {
        const named = [];
        state.people.forEach((p, i) => {
            if (String(p.name || '').trim()) named.push(i);
        });
        if (named.length) return named;
        return state.people.map((_, i) => i);
    }

    function incompleteProducts() {
        const bad = [];
        state.products.forEach((p) => {
            const boxes = Number(state.qty[p.catNo]) || 0;
            if (boxes <= 0) return;
            const need = boxes * state.vialsPerBox;
            const arr = state.splits[p.catNo] || [];
            const sum = arr.reduce((a, b) => a + (Number(b) || 0), 0);
            if (sum !== need) {
                bad.push({
                    catNo: p.catNo,
                    name: p.name,
                    need,
                    got: sum
                });
            }
        });
        return bad;
    }

    function computeTotals() {
        const incomplete = incompleteProducts();
        if (incomplete.length) return { incomplete, rows: null };

        const perPerson = state.people.map(() => ({ products: 0, shipping: 0, total: 0 }));
        let productGrand = 0;

        state.products.forEach((p) => {
            const boxes = Number(state.qty[p.catNo]) || 0;
            if (boxes <= 0) return;
            const arr = state.splits[p.catNo] || [];
            arr.forEach((vials, i) => {
                const v = Number(vials) || 0;
                if (v <= 0 || !perPerson[i]) return;
                const share = (v / state.vialsPerBox) * p.price;
                perPerson[i].products += share;
                productGrand += share;
            });
        });

        const shipIdx = shippingPeopleIndexes();
        const shipEach = shipIdx.length ? state.shippingFlat / shipIdx.length : 0;
        shipIdx.forEach((i) => {
            perPerson[i].shipping = shipEach;
        });
        perPerson.forEach((row) => {
            row.total = row.products + row.shipping;
        });

        const grand = productGrand + state.shippingFlat;
        return { incomplete: [], rows: perPerson, productGrand, grand };
    }

    function buildOrderPayload() {
        return {
            version: ORDER_FILE_VERSION,
            exportedAt: new Date().toISOString(),
            vialsPerBox: state.vialsPerBox,
            shippingFlat: state.shippingFlat,
            people: state.people,
            qty: state.qty,
            splits: state.splits
        };
    }

    function buildOrderHtml() {
        const totals = computeTotals();
        const lines = state.products.filter((p) => (Number(state.qty[p.catNo]) || 0) > 0);
        let productSub = 0;
        let html = '<div style="font-family:Segoe UI,Arial,sans-serif;color:#1c2a24">';
        html += '<h2>Pricing inquiry order</h2>';
        html += `<p>Each box = ${state.vialsPerBox} vials. Overseas shipping flat ${money(state.shippingFlat)}. Delivery typically 3–4 weeks.</p>`;
        html += '<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">';
        html += '<tr><th align="left">Cat.No</th><th align="left">Name</th><th>Amt</th><th>Boxes</th><th>Price/box</th><th>Line</th></tr>';
        lines.forEach((p) => {
            const boxes = Number(state.qty[p.catNo]) || 0;
            const line = boxes * p.price;
            productSub += line;
            html += `<tr><td>${escapeHtml(p.catNo)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.amt)}</td><td align="center">${boxes}</td><td align="right">${money(p.price)}</td><td align="right">${money(line)}</td></tr>`;
        });
        html += `<tr><td colspan="5" align="right">Shipping (overseas)</td><td align="right">${money(state.shippingFlat)}</td></tr>`;
        const grand = productSub + state.shippingFlat;
        html += `<tr><td colspan="5" align="right"><strong>Grand total</strong></td><td align="right"><strong>${money(grand)}</strong></td></tr>`;
        html += '</table>';

        html += '<h3>People &amp; vial splits</h3>';
        state.people.forEach((person, i) => {
            const label = String(person.name || '').trim() || `Person ${i + 1}`;
            html += `<p><strong>${escapeHtml(label)}</strong></p><ul>`;
            lines.forEach((p) => {
                const v = Number((state.splits[p.catNo] || [])[i]) || 0;
                if (v > 0) html += `<li>${escapeHtml(p.catNo)} ${escapeHtml(p.name)}: ${v} vials</li>`;
            });
            html += '</ul>';
        });

        if (totals.rows) {
            html += '<h3>Totals by person</h3><ul>';
            totals.rows.forEach((row, i) => {
                const label = String(state.people[i].name || '').trim() || `Person ${i + 1}`;
                html += `<li>${escapeHtml(label)}: ${money(row.total)} (products ${money(row.products)} + ship ${money(row.shipping)})</li>`;
            });
            html += '</ul>';
        } else {
            html += '<p><em>Vial assignments incomplete — per-person totals omitted.</em></p>';
        }
        html += '</div>';
        return html;
    }

    function exportOrder() {
        const payload = buildOrderPayload();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `pricing-order-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    function importOrder(file) {
        const status = $('pricing-import-status');
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result || ''));
                if (!data || typeof data !== 'object') throw new Error('Invalid file');
                applyCartPayload(data);
                ensureSplitsShape();
                persistCart();
                renderAll();
                if (status) {
                    status.hidden = false;
                    status.textContent = 'Order imported. Review quantities and vial splits.';
                }
            } catch (e) {
                if (status) {
                    status.hidden = false;
                    status.textContent = 'Could not import that file. Use a Pricing inquiry .json export.';
                }
            }
        };
        reader.readAsText(file);
    }

    async function emailOrder() {
        const status = $('pricing-email-status');
        const email = String($('pricing-email')?.value || '').trim();
        const show = (msg) => {
            if (status) {
                status.hidden = false;
                status.textContent = msg;
            }
        };

        if (!state.token) {
            show('Unlock pricing first.');
            promptUnlock();
            return;
        }
        if (!email || !email.includes('@')) {
            show('Enter your email address.');
            return;
        }
        const incomplete = incompleteProducts();
        if (incomplete.length) {
            show('Finish assigning vials before emailing.');
            return;
        }
        if (!state.products.some((p) => (Number(state.qty[p.catNo]) || 0) > 0)) {
            show('Add at least one box to the order first.');
            return;
        }

        show('Sending…');
        const data = await gasPost({
            action: 'pricingSendOrder',
            token: state.token,
            email,
            subject: 'Peptide Info — pricing inquiry order',
            orderHtml: buildOrderHtml(),
            orderJson: JSON.stringify(buildOrderPayload(), null, 2)
        });

        if (data && data.ok) {
            show(`Sent to ${email} (CC’d to the site admin).`);
        } else {
            show((data && data.error) || 'Could not send email. Redeploy Apps Script if needed.');
        }
    }

    function renderPeople() {
        const root = $('pricing-people');
        if (!root) return;
        root.innerHTML = state.people.map((p, i) => `
            <label class="pricing-person-field">
                <span>Person ${i + 1}</span>
                <input type="text" data-person-idx="${i}" value="${escapeAttr(p.name)}" maxlength="40" placeholder="Name">
            </label>
        `).join('');

        root.querySelectorAll('input[data-person-idx]').forEach((input) => {
            input.addEventListener('input', () => {
                const i = parseInt(input.dataset.personIdx, 10);
                state.people[i].name = input.value;
                persistCart();
                renderTotalsOnly();
            });
        });

        const addBtn = $('pricing-add-person');
        const remBtn = $('pricing-remove-person');
        if (addBtn) addBtn.disabled = state.people.length >= MAX_PEOPLE;
        if (remBtn) remBtn.disabled = state.people.length <= 1;
    }

    function wrapDisplayName(name, maxLen) {
        const limit = maxLen || 15;
        const words = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!words.length) return '';
        const lines = [];
        let line = '';
        words.forEach((word) => {
            if (!line) {
                line = word;
                return;
            }
            if ((line + ' ' + word).length <= limit) {
                line += ' ' + word;
            } else {
                lines.push(line);
                line = word;
            }
        });
        if (line) lines.push(line);
        return lines.map((l) => escapeHtml(l)).join('<br>');
    }

    function amtSortValue(product) {
        const parsed = parseAmt(product);
        if (!parsed) return Number.POSITIVE_INFINITY;
        if (parsed.unit === 'mcg') return parsed.qty / 1000;
        return parsed.qty;
    }

    function sortedProducts(list) {
        return (list || []).slice().sort((a, b) => {
            const byName = String(a.name || '').localeCompare(String(b.name || ''), undefined, {
                sensitivity: 'base',
                numeric: true
            });
            if (byName !== 0) return byName;
            const byAmt = amtSortValue(a) - amtSortValue(b);
            if (byAmt !== 0) return byAmt;
            return String(a.amt || '').localeCompare(String(b.amt || ''), undefined, {
                sensitivity: 'base',
                numeric: true
            });
        });
    }

    function groupProductsByName(list) {
        const groups = [];
        let current = null;
        sortedProducts(list).forEach((p) => {
            const key = String(p.name || '').trim() || String(p.catNo || '');
            if (!current || current.key !== key) {
                current = { key, name: p.name || key, items: [] };
                groups.push(current);
            }
            current.items.push(p);
        });
        return groups;
    }

    function renderProductRow(p, { hideName } = {}) {
        const q = Number(state.qty[p.catNo]) || 0;
        const dpm = perMg(p);
        const tip = weekTip(p, perUnit(p));
        const tipHtml = tip
            ? `<button type="button" class="pricing-tip" data-tip="${escapeAttr(tip)}" aria-label="${escapeAttr(tip)}">i</button>`
            : '';
        return `
            <tr class="pricing-item-row" data-cat="${escapeAttr(p.catNo)}" data-group="${escapeAttr(String(p.name || '').trim() || p.catNo)}">
                <td class="pricing-name">${hideName ? '' : wrapDisplayName(p.name, 18)}</td>
                <td class="pricing-amt">${escapeHtml(p.amt)}</td>
                <td class="pricing-money">${money(p.price)}</td>
                <td>
                    <span class="pricing-per-mg">
                        <span class="pricing-money">${dpm != null ? money(dpm) : '—'}</span>
                        ${tipHtml}
                    </span>
                </td>
                <td>
                    <div class="qty-ctrl">
                        <button type="button" data-qty-delta="-1" data-cat="${escapeAttr(p.catNo)}" aria-label="Decrease">−</button>
                        <span class="qty-val">${q}</span>
                        <button type="button" data-qty-delta="1" data-cat="${escapeAttr(p.catNo)}" aria-label="Increase">+</button>
                    </div>
                </td>
            </tr>
        `;
    }

    function renderTable() {
        const tbody = $('pricing-tbody');
        if (!tbody) return;

        const groups = groupProductsByName(state.products);
        if (!groups.length) {
            tbody.innerHTML = '<tr><td colspan="5">No products in sheet.</td></tr>';
            return;
        }

        tbody.innerHTML = groups.map((g) => {
            const boxes = g.items.reduce((sum, p) => sum + (Number(state.qty[p.catNo]) || 0), 0);
            const prices = g.items.map((p) => p.price).filter((n) => Number.isFinite(n));
            const lo = prices.length ? Math.min(...prices) : null;
            const hi = prices.length ? Math.max(...prices) : null;
            const priceHint = lo == null
                ? ''
                : (lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`);
            const open = state.expandedGroups.has(g.key) || boxes > 0;
            if (open) state.expandedGroups.add(g.key);

            const head = `
                <tr class="pricing-group-row${open ? ' is-open' : ''}" data-group="${escapeAttr(g.key)}">
                    <td colspan="5">
                        <button type="button" class="pricing-group-toggle" data-group-toggle="${escapeAttr(g.key)}" aria-expanded="${open ? 'true' : 'false'}">
                            <span class="pricing-group-chevron" aria-hidden="true"></span>
                            <span class="pricing-group-title">${escapeHtml(g.name)}</span>
                            <span class="pricing-group-meta">${g.items.length} size${g.items.length === 1 ? '' : 's'}${priceHint ? ` · ${priceHint}` : ''}${boxes ? ` · ${boxes} box${boxes === 1 ? '' : 'es'}` : ''}</span>
                        </button>
                    </td>
                </tr>
            `;

            const kids = g.items.map((p) => {
                const row = renderProductRow(p, { hideName: true });
                return open ? row : row.replace('<tr ', '<tr hidden ');
            }).join('');

            return head + kids;
        }).join('');

        tbody.querySelectorAll('[data-group-toggle]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.groupToggle;
                if (state.expandedGroups.has(key)) state.expandedGroups.delete(key);
                else state.expandedGroups.add(key);
                renderTable();
            });
        });

        tbody.querySelectorAll('[data-qty-delta]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const delta = parseInt(btn.dataset.qtyDelta, 10);
                const cur = Number(state.qty[cat]) || 0;
                const product = state.products.find((p) => p.catNo === cat);
                const groupKey = String(product?.name || '').trim() || cat;
                if (cur + delta > 0) state.expandedGroups.add(groupKey);
                setQty(cat, cur + delta);
            });
        });
    }

    function needVials(catNo) {
        return (Number(state.qty[catNo]) || 0) * state.vialsPerBox;
    }

    function ensureSplitArray(catNo) {
        if (!Array.isArray(state.splits[catNo])) state.splits[catNo] = [];
        while (state.splits[catNo].length < state.people.length) state.splits[catNo].push(0);
        if (state.splits[catNo].length > state.people.length) {
            state.splits[catNo] = state.splits[catNo].slice(0, state.people.length);
        }
        return state.splits[catNo];
    }

    /** Cap assignments so they never exceed vials available for that line. */
    function normalizeSplits(catNo) {
        const need = needVials(catNo);
        const arr = ensureSplitArray(catNo).map((v) => {
            const n = parseInt(v, 10);
            return Number.isFinite(n) && n > 0 ? n : 0;
        });
        let sum = arr.reduce((a, b) => a + b, 0);
        if (sum > need) {
            let excess = sum - need;
            for (let i = arr.length - 1; i >= 0 && excess > 0; i--) {
                const cut = Math.min(arr[i], excess);
                arr[i] -= cut;
                excess -= cut;
            }
        }
        state.splits[catNo] = arr;
        return arr;
    }

    function setSplitAmount(catNo, idx, raw) {
        const need = needVials(catNo);
        const arr = ensureSplitArray(catNo);
        let v = parseInt(raw, 10);
        if (!Number.isFinite(v) || v < 0) v = 0;
        const others = arr.reduce((a, b, i) => (i === idx ? a : a + (Number(b) || 0)), 0);
        const max = Math.max(0, need - others);
        v = Math.min(v, max);
        arr[idx] = v;
        state.splits[catNo] = arr;
        return v;
    }

    function giveRestToPerson(catNo, idx) {
        const need = needVials(catNo);
        const arr = ensureSplitArray(catNo);
        const others = arr.reduce((a, b, i) => (i === idx ? a : a + (Number(b) || 0)), 0);
        arr[idx] = Math.max(0, need - others);
        state.splits[catNo] = arr;
        persistCart();
        renderSplits();
        renderTotalsOnly();
    }

    function renderSelected() {
        const root = $('pricing-selected');
        const empty = $('pricing-selected-empty');
        if (!root) return;

        const active = state.products.filter((p) => (Number(state.qty[p.catNo]) || 0) > 0);
        if (!active.length) {
            root.innerHTML = '';
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        root.innerHTML = active.map((p) => {
            const boxes = Number(state.qty[p.catNo]) || 0;
            const vials = boxes * state.vialsPerBox;
            return `
                <div class="pricing-selected-row" data-cat="${escapeAttr(p.catNo)}">
                    <div class="pricing-selected-meta">
                        ${escapeHtml(p.name)}
                        <span>${escapeHtml(p.amt)} · ${money(p.price)} / box · ${vials} vial${vials === 1 ? '' : 's'}</span>
                    </div>
                    <div class="qty-ctrl">
                        <button type="button" data-sel-qty-delta="-1" data-cat="${escapeAttr(p.catNo)}" aria-label="Decrease">−</button>
                        <span class="qty-val">${boxes}</span>
                        <button type="button" data-sel-qty-delta="1" data-cat="${escapeAttr(p.catNo)}" aria-label="Increase">+</button>
                    </div>
                    <button type="button" class="pricing-remove" data-sel-remove="${escapeAttr(p.catNo)}">Remove</button>
                </div>
            `;
        }).join('');

        root.querySelectorAll('[data-sel-qty-delta]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const delta = parseInt(btn.dataset.selQtyDelta, 10);
                const cur = Number(state.qty[cat]) || 0;
                setQty(cat, cur + delta);
            });
        });

        root.querySelectorAll('[data-sel-remove]').forEach((btn) => {
            btn.addEventListener('click', () => {
                setQty(btn.dataset.selRemove, 0);
            });
        });
    }

    function renderSplits() {
        const root = $('pricing-splits');
        const empty = $('pricing-split-empty');
        if (!root) return;

        const active = state.products.filter((p) => (Number(state.qty[p.catNo]) || 0) > 0);
        if (!active.length) {
            root.innerHTML = '';
            if (empty) empty.hidden = false;
            return;
        }
        if (empty) empty.hidden = true;

        root.innerHTML = active.map((p) => {
            const boxes = Number(state.qty[p.catNo]) || 0;
            const need = boxes * state.vialsPerBox;
            const arr = normalizeSplits(p.catNo);
            const assigned = arr.reduce((a, b) => a + b, 0);
            const left = Math.max(0, need - assigned);
            const leftHtml = left > 0
                ? `<span class="pricing-split-left">${left} left</span>`
                : `<span>all assigned</span>`;

            const inputs = state.people.map((person, i) => {
                const label = String(person.name || '').trim() || `Person ${i + 1}`;
                const others = arr.reduce((a, b, j) => (j === i ? a : a + (Number(b) || 0)), 0);
                const max = Math.max(0, need - others);
                const showRest = left > 0;
                return `
                    <label>
                        <span>${escapeHtml(label)}</span>
                        <div class="split-input-row">
                            <input type="number" min="0" max="${max}" step="1" inputmode="numeric"
                                data-split-cat="${escapeAttr(p.catNo)}" data-split-idx="${i}"
                                value="${Number(arr[i]) || 0}">
                            <button type="button" class="pricing-rest-btn"
                                data-rest-cat="${escapeAttr(p.catNo)}" data-rest-idx="${i}"
                                ${showRest ? '' : 'hidden'}
                                title="Give remaining ${left} vial${left === 1 ? '' : 's'} to ${escapeAttr(label)}">+rest</button>
                        </div>
                    </label>
                `;
            }).join('');

            return `
                <div class="pricing-split-row">
                    <div class="pricing-split-prod">
                        ${escapeHtml(p.catNo)} · ${escapeHtml(p.name)}
                        <span>${boxes} box${boxes === 1 ? '' : 'es'} = ${need} vials · ${leftHtml}</span>
                    </div>
                    ${inputs}
                </div>
            `;
        }).join('');

        root.querySelectorAll('input[data-split-cat]').forEach((input) => {
            const clampOnly = () => {
                const cat = input.dataset.splitCat;
                const idx = parseInt(input.dataset.splitIdx, 10);
                const capped = setSplitAmount(cat, idx, input.value);
                if (String(capped) !== input.value) input.value = String(capped);
                persistCart();
                renderTotalsOnly();
                // Refresh left counts / +rest without stealing focus
                const row = input.closest('.pricing-split-row');
                if (!row) return;
                const need = needVials(cat);
                const arr = state.splits[cat] || [];
                const assigned = arr.reduce((a, b) => a + (Number(b) || 0), 0);
                const left = Math.max(0, need - assigned);
                const meta = row.querySelector('.pricing-split-prod span');
                const boxes = Number(state.qty[cat]) || 0;
                if (meta) {
                    meta.innerHTML = `${boxes} box${boxes === 1 ? '' : 'es'} = ${need} vials · ${
                        left > 0
                            ? `<span class="pricing-split-left">${left} left</span>`
                            : '<span>all assigned</span>'
                    }`;
                }
                row.querySelectorAll('[data-rest-cat]').forEach((btn) => {
                    btn.hidden = left <= 0;
                    const bi = parseInt(btn.dataset.restIdx, 10);
                    const label = String(state.people[bi]?.name || '').trim() || `Person ${bi + 1}`;
                    btn.title = `Give remaining ${left} vial${left === 1 ? '' : 's'} to ${label}`;
                });
                row.querySelectorAll('input[data-split-cat]').forEach((inp) => {
                    const i = parseInt(inp.dataset.splitIdx, 10);
                    const others = arr.reduce((a, b, j) => (j === i ? a : a + (Number(b) || 0)), 0);
                    inp.max = String(Math.max(0, need - others));
                });
            };
            input.addEventListener('input', clampOnly);
            input.addEventListener('change', clampOnly);
        });

        root.querySelectorAll('[data-rest-cat]').forEach((btn) => {
            btn.addEventListener('click', () => {
                giveRestToPerson(btn.dataset.restCat, parseInt(btn.dataset.restIdx, 10));
            });
        });
    }

    function renderTotalsOnly() {
        const err = $('pricing-split-error');
        const totals = $('pricing-totals');
        const result = computeTotals();

        if (result.incomplete.length) {
            if (err) {
                err.hidden = false;
                err.innerHTML = `<strong>Vials not fully assigned.</strong> Fix these before totals show:<ul style="margin:8px 0 0;padding-left:18px">${
                    result.incomplete.map((x) =>
                        `<li>${escapeHtml(x.catNo)} — ${escapeHtml(x.name)}: ${x.got} / ${x.need} vials</li>`
                    ).join('')
                }</ul>`;
            }
            if (totals) {
                totals.hidden = true;
                totals.innerHTML = '';
            }
            return;
        }

        if (err) {
            err.hidden = true;
            err.innerHTML = '';
        }

        const hasQty = state.products.some((p) => (Number(state.qty[p.catNo]) || 0) > 0);
        if (!hasQty || !result.rows) {
            if (totals) {
                totals.hidden = true;
                totals.innerHTML = '';
            }
            return;
        }

        if (totals) {
            totals.hidden = false;
            totals.innerHTML = result.rows.map((row, i) => {
                const label = String(state.people[i].name || '').trim() || `Person ${i + 1}`;
                return `
                    <div class="pricing-total-row">
                        <span>${escapeHtml(label)}</span>
                        <span>${money(row.total)} <span style="color:var(--muted);font-weight:500;font-size:0.85em">(products ${money(row.products)} + ship ${money(row.shipping)})</span></span>
                    </div>
                `;
            }).join('') + `
                <div class="pricing-total-row grand">
                    <span>Order total</span>
                    <span>${money(result.grand)}</span>
                </div>
            `;
        }
    }

    function renderAll() {
        ensureSplitsShape();
        renderPeople();
        renderTable();
        renderSelected();
        renderSplits();
        renderTotalsOnly();
        persistCart();
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(s) {
        return escapeHtml(s).replace(/'/g, '&#39;');
    }

    function addPerson() {
        if (state.people.length >= MAX_PEOPLE) return;
        state.people.push({ name: `Person ${state.people.length + 1}` });
        Object.keys(state.splits).forEach((cat) => {
            if (!Array.isArray(state.splits[cat])) state.splits[cat] = [];
            state.splits[cat].push(0);
        });
        persistCart();
        renderAll();
    }

    function removePerson() {
        if (state.people.length <= 1) return;
        state.people.pop();
        Object.keys(state.splits).forEach((cat) => {
            if (Array.isArray(state.splits[cat])) state.splits[cat].pop();
        });
        persistCart();
        renderAll();
    }

    function bindUi() {
        $('pricing-unlock-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const pw = $('pricing-password')?.value || '';
            unlock(pw);
        });
        $('pricing-modal-cancel')?.addEventListener('click', closeModal);
        $('pricing-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'pricing-modal') closeModal();
        });
        $('pricing-add-person')?.addEventListener('click', addPerson);
        $('pricing-remove-person')?.addEventListener('click', removePerson);
        $('pricing-export')?.addEventListener('click', exportOrder);
        $('pricing-import')?.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            importOrder(file);
            e.target.value = '';
        });
        $('pricing-email-send')?.addEventListener('click', emailOrder);
    }

    async function onShow() {
        if (!isUnlocked()) {
            promptUnlock();
            return;
        }
        if (!state.loaded) await loadCatalog();
        else renderAll();
    }

    function boot() {
        clearUnlockOnReload();
        restoreCart();
        bindUi();
        setTabLocked(!isUnlocked());
        if (isUnlocked()) setTabLocked(false);
    }

    window.PricingInquiry = {
        isUnlocked,
        promptUnlock,
        onShow,
        lockAgain
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
