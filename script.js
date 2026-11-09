/* ===== Pengaturan (ubah sesuai kebutuhan) ===== */
const NAMA_USAHA = 'KASIR BILLIARD';
const ALAMAT = 'Alamat usaha Anda';
const PEMBULATAN_MENIT = 15; // waktu main dibulatkan ke atas per 15 menit
const MEJA = [
  { id: 1, nama: 'Meja 1', tipe: 'Reguler', tarif: 30000 },
  { id: 2, nama: 'Meja 2', tipe: 'Reguler', tarif: 30000 },
  { id: 3, nama: 'Meja 3', tipe: 'Reguler', tarif: 30000 },
  { id: 4, nama: 'Meja 4', tipe: 'Reguler', tarif: 30000 },
  { id: 5, nama: 'Meja 5', tipe: 'VIP', tarif: 50000 },
  { id: 6, nama: 'Meja 6', tipe: 'VIP', tarif: 50000 }
];
const MENU = [
  { n: 'Air Mineral', h: 5000 },
  { n: 'Es Teh', h: 7000 },
  { n: 'Kopi Susu', h: 15000 },
  { n: 'Roti Bakar', h: 14000 },
  { n: 'Kentang Goreng', h: 15000 },
  { n: 'Mie Goreng', h: 18000 }
];

/* ===== Utilitas ===== */
const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const jam = ts => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
const tglPanjang = ts => new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
const hms = ms => { const t = Math.floor(ms / 1000); return [t / 3600 | 0, (t % 3600) / 60 | 0, t % 60].map(x => String(x).padStart(2, '0')).join(':'); };
const durasi = m => { const j = Math.floor(m / 60), s = m % 60; return ((j ? j + ' jam ' : '') + (s || !j ? s + ' menit' : '')).trim(); };

let sesi = load('kb_sesi', {});
let riwayat = load('kb_riwayat', []);
let booking = load('kb_booking', []);
let cur = null;

/* ===== Perhitungan ===== */
function hitung(s) {
  const m = MEJA.find(x => x.id == s.meja);
  const menit = Math.max(1, Math.ceil(((s.selesai || Date.now()) - s.mulai) / 60000));
  const blok = Math.ceil(menit / PEMBULATAN_MENIT) * PEMBULATAN_MENIT;
  const main = Math.round(m.tarif * blok / 60);
  const items = Object.entries(s.items).filter(([, q]) => q > 0).map(([n, q]) => ({ n, q, h: MENU.find(x => x.n == n).h }));
  const menu = items.reduce((a, i) => a + i.h * i.q, 0);
  const sub = main + menu;
  const disk = Math.min(sub, s.dTipe === 'persen' ? Math.round(sub * s.dNilai / 100) : s.dNilai);
  return { m, menit, main, items, menu, sub, disk, total: sub - disk };
}

/* ===== Tampilan meja ===== */
function renderMeja() {
  $('#gridMeja').innerHTML = MEJA.map(m => {
    const s = sesi[m.id];
    if (!s) return `<article class="meja"><div class="mh"><h3>${m.nama}</h3><span class="tipe">${m.tipe}</span></div>
      <p class="tarif">${rp(m.tarif)} per jam</p><p class="tarif">Kosong</p>
      <button data-act="mulai" data-id="${m.id}">Mulai main</button></article>`;
    return `<article class="meja pakai"><div class="mh"><h3>${m.nama}</h3><span class="tipe">${m.tipe}</span></div>
      <p class="pembeli">${esc(s.pembeli)}</p>
      <div class="timer" data-t="${m.id}">00:00:00</div>
      <p class="biaya" data-b="${m.id}"></p>
      <button data-act="bayar" data-id="${m.id}">Selesai dan bayar</button></article>`;
  }).join('');
  tick();
}
function tick() {
  Object.values(sesi).forEach(s => {
    const t = document.querySelector(`[data-t="${s.meja}"]`), b = document.querySelector(`[data-b="${s.meja}"]`);
    if (!t) return;
    t.textContent = hms(Date.now() - s.mulai);
    const h = hitung(s);
    b.textContent = `Mulai ${jam(s.mulai)} | main ${rp(h.main)} | menu ${rp(h.menu)}`;
  });
}
setInterval(tick, 1000);

$('#gridMeja').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const id = +b.dataset.id;
  if (b.dataset.act === 'mulai') {
    cur = id; $('#mTitle').textContent = 'Mulai main di ' + MEJA.find(m => m.id === id).nama;
    $('#mNama').value = ''; $('#dlgMulai').showModal(); $('#mNama').focus();
  } else bukaBayar(id);
});

/* ===== Mulai main ===== */
$('#formMulai').addEventListener('submit', e => {
  e.preventDefault();
  sesi[cur] = { meja: cur, pembeli: $('#mNama').value.trim(), mulai: Date.now(), items: {}, dTipe: 'persen', dNilai: 0 };
  save('kb_sesi', sesi); $('#dlgMulai').close(); renderMeja();
});
$('#mBatal').onclick = () => $('#dlgMulai').close();

/* ===== Pembayaran ===== */
function bukaBayar(id) {
  cur = id; const s = sesi[id]; s.selesai = Date.now();
  $('#bTitle').textContent = `${MEJA.find(m => m.id === id).nama} atas nama ${s.pembeli}`;
  $('#dTipe').value = s.dTipe; $('#dNilai').value = s.dNilai; $('#uang').value = '';
  renderMenuBayar(); refresh(); $('#dlgBayar').showModal();
}
function renderMenuBayar() {
  const s = sesi[cur];
  $('#bMenu').innerHTML = MENU.map(i => `<div class="item"><div><b>${i.n}</b><small>${rp(i.h)}</small></div>
    <div class="qty"><button data-n="${i.n}" data-d="-1">-</button><span>${s.items[i.n] || 0}</span><button data-n="${i.n}" data-d="1">+</button></div></div>`).join('');
}
$('#bMenu').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const s = sesi[cur]; s.items[b.dataset.n] = Math.max(0, (s.items[b.dataset.n] || 0) + +b.dataset.d);
  renderMenuBayar(); refresh();
});
['dTipe', 'dNilai', 'uang'].forEach(id => $('#' + id).addEventListener('input', () => {
  const s = sesi[cur]; s.dTipe = $('#dTipe').value; s.dNilai = Math.max(0, +$('#dNilai').value || 0); refresh();
}));
$('#uangPas').onclick = () => { $('#uang').value = hitung(sesi[cur]).total; refresh(); };

function refresh() {
  const s = sesi[cur], h = hitung(s), uang = +$('#uang').value || 0;
  const baris = (a, b, k = '') => `<div class="${k}"><dt>${a}</dt><dd>${b}</dd></div>`;
  $('#rincian').innerHTML =
    baris('Mulai sampai selesai', `${jam(s.mulai)} - ${jam(s.selesai)}`) +
    baris('Lama main', durasi(h.menit)) +
    baris('Tarif per jam', rp(h.m.tarif)) +
    baris('Biaya main', rp(h.main)) +
    baris('Menu', rp(h.menu)) +
    baris('Subtotal', rp(h.sub)) +
    baris('Diskon', '- ' + rp(h.disk)) +
    baris('Total bayar', rp(h.total), 'tot');
  const sel = uang - h.total;
  $('#kembali').textContent = uang ? (sel >= 0 ? rp(sel) : 'Kurang ' + rp(-sel)) : rp(0);
  $('.kembali').classList.toggle('kurang', uang > 0 && sel < 0);
  $('#bBayar').disabled = !uang || sel < 0;
}
$('#bBatal').onclick = () => { delete sesi[cur].selesai; save('kb_sesi', sesi); $('#dlgBayar').close(); };
$('#dlgBayar').addEventListener('cancel', () => { delete sesi[cur].selesai; save('kb_sesi', sesi); });

$('#bBayar').onclick = () => {
  const s = sesi[cur], h = hitung(s), uang = +$('#uang').value;
  const no = 'KB-' + String(Math.max(0, ...riwayat.map(r => +r.no.slice(3))) + 1).padStart(4, '0');
  const r = {
    no, ts: s.selesai, pembeli: s.pembeli, mejaNama: h.m.nama, tipe: h.m.tipe, tarif: h.m.tarif,
    mulai: s.mulai, selesai: s.selesai, menit: h.menit, main: h.main, items: h.items, menu: h.menu,
    sub: h.sub, dTipe: s.dTipe, dNilai: s.dNilai, disk: h.disk, total: h.total, uang, kembali: uang - h.total
  };
  riwayat.unshift(r); delete sesi[cur];
  save('kb_riwayat', riwayat); save('kb_sesi', sesi);
  $('#dlgBayar').close(); renderMeja(); renderRiwayat(); tampilStruk(r);
};

/* ===== Struk ===== */
function teksStruk(r) {
  const W = 32, line = '-'.repeat(W);
  const pad = (a, b) => a + ' '.repeat(Math.max(1, W - a.length - b.length)) + b;
  const mid = t => ' '.repeat(Math.max(0, (W - t.length) / 2 | 0)) + t;
  const L = [mid(NAMA_USAHA), mid(ALAMAT), line,
    pad('No', r.no), pad('Tanggal', tglPanjang(r.ts)), pad('Pembeli', r.pembeli),
    pad(r.mejaNama, r.tipe), pad('Waktu', `${jam(r.mulai)} - ${jam(r.selesai)}`), line,
    pad('Main ' + durasi(r.menit), rp(r.main)), pad(`  (${rp(r.tarif)} per jam)`, '')];
  r.items.forEach(i => L.push(pad(`${i.n} x${i.q}`, rp(i.h * i.q))));
  L.push(line, pad('Subtotal', rp(r.sub)),
    pad('Diskon' + (r.dTipe === 'persen' && r.dNilai ? ` ${r.dNilai}%` : ''), '-' + rp(r.disk)),
    pad('TOTAL', rp(r.total)), pad('Tunai', rp(r.uang)), pad('Kembali', rp(r.kembali)),
    line, mid('Terima kasih'), mid('Pembayaran tunai'));
  return L.join('\n');
}
function tampilStruk(r) { $('#struk').textContent = teksStruk(r); $('#dlgStruk').showModal(); }
$('#sTutup').onclick = () => $('#dlgStruk').close();
$('#sCetak').onclick = () => window.print();

/* ===== Riwayat ===== */
function renderRiwayat() {
  const q = $('#cari').value.trim().toLowerCase();
  const data = riwayat.filter(r => !q || r.pembeli.toLowerCase().includes(q) || r.no.toLowerCase().includes(q));
  $('#ringkas').textContent = `${data.length} transaksi | total ${rp(data.reduce((a, r) => a + r.total, 0))}`;
  $('#isiRiwayat').innerHTML = data.length ? data.map(r => `<tr>
    <td>${tglPanjang(r.ts)}<small>${jam(r.mulai)} - ${jam(r.selesai)}</small></td><td>${r.no}</td><td>${esc(r.pembeli)}</td>
    <td>${r.mejaNama}<small>${r.tipe}</small></td><td>${durasi(r.menit)}</td><td>${rp(r.tarif)}</td><td>${rp(r.main)}</td>
    <td>${rp(r.menu)}<small>${r.items.map(i => `${i.n} x${i.q}`).join(', ') || 'Tanpa menu'}</small></td>
    <td>${r.disk ? '-' + rp(r.disk) : '-'}<small>${r.dTipe === 'persen' && r.dNilai ? r.dNilai + '%' : ''}</small></td>
    <td><b>${rp(r.total)}</b></td><td>${rp(r.uang)}</td><td>${rp(r.kembali)}</td>
    <td><button class="tombol-kecil" data-no="${r.no}">Struk</button></td></tr>`).join('')
    : `<tr><td colspan="13" class="kosong">Belum ada pesanan yang cocok.</td></tr>`;
  const hari = new Date().toDateString();
  $('#omzetHari').textContent = rp(riwayat.filter(r => new Date(r.ts).toDateString() === hari).reduce((a, r) => a + r.total, 0));
}
$('#cari').addEventListener('input', renderRiwayat);
$('#isiRiwayat').addEventListener('click', e => {
  const b = e.target.closest('button'); if (b) tampilStruk(riwayat.find(r => r.no === b.dataset.no));
});
$('#hapusRiwayat').onclick = () => {
  if (riwayat.length && confirm('Hapus semua riwayat pesanan? Tindakan ini tidak bisa dibatalkan.')) {
    riwayat = []; save('kb_riwayat', riwayat); renderRiwayat();
  }
};

/* ===== Booking ===== */
$('#bkMeja').innerHTML = MEJA.map(m => `<option value="${m.nama}">${m.nama} (${m.tipe})</option>`).join('');
$('#formBooking').addEventListener('submit', e => {
  e.preventDefault();
  booking.push({ id: Date.now(), nama: $('#bkNama').value.trim(), meja: $('#bkMeja').value, tgl: $('#bkTgl').value, jam: $('#bkJam').value, lama: +$('#bkDurasi').value || 1 });
  save('kb_booking', booking); e.target.reset(); $('#bkDurasi').value = 1; renderBooking();
});
function renderBooking() {
  const d = [...booking].sort((a, b) => (a.tgl + a.jam).localeCompare(b.tgl + b.jam));
  $('#listBooking').innerHTML = d.length ? `<table style="min-width:600px"><thead><tr><th>Tanggal</th><th>Jam</th><th>Pemesan</th><th>Meja</th><th>Durasi</th><th></th></tr></thead><tbody>` +
    d.map(b => `<tr><td>${b.tgl}</td><td>${b.jam}</td><td>${esc(b.nama)}</td><td>${b.meja}</td><td>${b.lama} jam</td><td><button class="tombol-kecil" data-id="${b.id}">Hapus</button></td></tr>`).join('') + '</tbody></table>'
    : '<p class="kosong">Belum ada booking. Isi formulir di atas untuk menambah.</p>';
}
$('#listBooking').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  booking = booking.filter(x => x.id != b.dataset.id); save('kb_booking', booking); renderBooking();
});

/* ===== Tab & mulai ===== */
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button,.tab').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); $('#tab-' + b.dataset.tab).classList.add('on');
});
$('#tgl').textContent = tglPanjang(Date.now());
renderMeja(); renderRiwayat(); renderBooking();