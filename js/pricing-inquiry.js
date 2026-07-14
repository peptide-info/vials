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

    const state = {
        token: sessionStorage.getItem(STORAGE_TOKEN) || '',
        products: [],
        qty: {},          // catNo -> boxes
        people: [{ name: 'Person 1' }],
        splits: {},       // catNo -> [vials per person]
        warehouse: 'HK',
        shippingFlat: SHIPPING_FLAT,
        vialsPerBox: VIALS_PER_BOX,
        loaded: false,
        loading: false
    };

    function $(id) {
        return document.getElementById(id);
    }

    function money(n) {
        if (!Number.isFinite(n)) return '—';
        return '$' + n.toFixed(2);
    }

    function perMg(product) {
        const mg = product.amtMg;
        if (!Number.isFinite(mg) || mg <= 0) return null;
        return product.price / (state.vialsPerBox * mg);
    }

    function weekTip(product, dollarPerMg) {
        const min = product.minMgWeek;
        const max = product.maxMgWeek;
        if (!Number.isFinite(dollarPerMg)) return '';
        if (!Number.isFinite(min) && !Number.isFinite(max)) return '';
        if (Number.isFinite(min) && Number.isFinite(max)) {
            return `Est. $/week: ${money(dollarPerMg * min)}–${money(dollarPerMg * max)} (${min}–${max} mg/week)`;
        }
        if (Number.isFinite(min)) {
            return `Est. $/week: ~${money(dollarPerMg * min)} (from ${min} mg/week)`;
        }
        return `Est. $/week: ~${money(dollarPerMg * max)} (from ${max} mg/week)`;
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
            const data = JSON.parse(raw);
            if (data.qty && typeof data.qty === 'object') state.qty = data.qty;
            if (Array.isArray(data.people) && data.people.length) {
                state.people = data.people.slice(0, MAX_PEOPLE).map((p, i) => ({
                    name: (p && p.name != null ? String(p.name) : '') || `Person ${i + 1}`
                }));
            }
            if (data.splits && typeof data.splits === 'object') state.splits = data.splits;
        } catch (ignore) {}
    }

    function gasRequest(params) {
        const qs = new URLSearchParams(params).toString();
        const url = `${SCRIPT_URL}?${qs}`;

        return fetch(url, { method: 'GET', redirect: 'follow' })
            .then((res) => res.text())
            .then((text) => {
                try {
                    return JSON.parse(text);
                } catch (err) {
                    // JSONP / redirect HTML failure → JSONP fallback
                    return gasJsonp(params);
                }
            })
            .catch(() => gasJsonp(params));
    }

    function gasJsonp(params) {
        return new Promise((resolve, reject) => {
            const cb = `_pricingCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
            const script = document.createElement('script');
            const t = setTimeout(() => {
                cleanup();
                reject(new Error('Pricing request timed out'));
            }, 20000);

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
                        err.textContent = `Apps Script is not updated yet (live is ${data.version}). Paste PricingInquiry.gs + EmailSchedule.gs, set PRICING_PASSWORD, then Deploy → New version.`;
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
            await loadCatalog();
            window.showMainView?.('pricing');
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
        window.showMainView?.('protocols');
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
                if (data && /expired|unlock/i.test(String(data.error || ''))) {
                    lockAgain();
                    promptUnlock();
                }
                if (status) status.textContent = (data && data.error) || 'Could not load catalog.';
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
            if (status) status.textContent = 'Could not load catalog. Redeploy Apps Script if this persists.';
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
            // Soft default: if only one person and nothing assigned, give them all vials
            if (need > 0 && n === 1 && arr.reduce((a, b) => a + b, 0) === 0) {
                arr[0] = need;
            }
            state.splits[key] = arr;
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
                // leave zeros so user must assign (error shows)
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

    function renderTable() {
        const tbody = $('pricing-tbody');
        if (!tbody) return;
        tbody.innerHTML = state.products.map((p) => {
            const q = Number(state.qty[p.catNo]) || 0;
            const dpm = perMg(p);
            const tip = weekTip(p, dpm);
            const tipHtml = tip
                ? `<button type="button" class="pricing-tip" data-tip="${escapeAttr(tip)}" aria-label="${escapeAttr(tip)}">i</button>`
                : '';
            return `
                <tr data-cat="${escapeAttr(p.catNo)}">
                    <td class="pricing-cat">${escapeHtml(p.catNo)}</td>
                    <td>${escapeHtml(p.name)}</td>
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
        }).join('') || '<tr><td colspan="6">No products in sheet.</td></tr>';

        tbody.querySelectorAll('[data-qty-delta]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const delta = parseInt(btn.dataset.qtyDelta, 10);
                const cur = Number(state.qty[cat]) || 0;
                setQty(cat, cur + delta);
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
            const arr = state.splits[p.catNo] || state.people.map(() => 0);
            const inputs = state.people.map((person, i) => {
                const label = String(person.name || '').trim() || `Person ${i + 1}`;
                return `
                    <label>
                        <span>${escapeHtml(label)}</span>
                        <input type="number" min="0" step="1" inputmode="numeric"
                            data-split-cat="${escapeAttr(p.catNo)}" data-split-idx="${i}"
                            value="${Number(arr[i]) || 0}">
                    </label>
                `;
            }).join('');
            return `
                <div class="pricing-split-row">
                    <div class="pricing-split-prod">
                        ${escapeHtml(p.catNo)} · ${escapeHtml(p.name)}
                        <span>${boxes} box${boxes === 1 ? '' : 'es'} = ${need} vials</span>
                    </div>
                    ${inputs}
                </div>
            `;
        }).join('');

        root.querySelectorAll('input[data-split-cat]').forEach((input) => {
            input.addEventListener('input', () => {
                const cat = input.dataset.splitCat;
                const idx = parseInt(input.dataset.splitIdx, 10);
                let v = parseInt(input.value, 10);
                if (!Number.isFinite(v) || v < 0) v = 0;
                if (!Array.isArray(state.splits[cat])) state.splits[cat] = state.people.map(() => 0);
                while (state.splits[cat].length < state.people.length) state.splits[cat].push(0);
                state.splits[cat][idx] = v;
                persistCart();
                renderTotalsOnly();
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
        $('pricing-lock-btn')?.addEventListener('click', lockAgain);
        $('pricing-add-person')?.addEventListener('click', addPerson);
        $('pricing-remove-person')?.addEventListener('click', removePerson);
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
        restoreCart();
        bindUi();
        setTabLocked(!isUnlocked());
        if (isUnlocked()) {
            // Validate token quietly; load when user opens tab
            setTabLocked(false);
        }
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
