/* ============================================================
   Горбилет · Карта причалов
   Движок: Яндекс.Карты JS API 2.1
   Данные: data/piers.json
   ============================================================ */

(function () {
  'use strict';

  // ---- настройки ----
  const PIN_ICON = 'assets/pin-flame.svg';
  const TYPE_LABEL = { teplohod: 'Теплоход', kater: 'Катер', meteor: 'Метеор' };

  let map, piersData, placemarks = [], userCoords = null, currentFilter = 'all';

  /* ---------- утилиты ---------- */

  // расстояние между двумя точками (формула гаверсинуса), км
  function distanceKm(a, b) {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    const lat1 = a[0] * rad, lat2 = b[0] * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // экранирование для безопасной вставки в HTML балуна
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // HTML содержимого балуна причала
  function balloonHTML(pier) {
    const actions = pier.actions.map(a => `
      <div class="gb-action">
        <div class="gb-action__row">
          <span class="gb-action__title">${esc(a.title)}</span>
          ${a.discount ? `<span class="gb-action__disc">−${a.discount}%</span>` : ''}
        </div>
        <a class="gb-action__buy" href="${esc(a.url)}" target="_blank" rel="noopener">Купить билет →</a>
      </div>`).join('');
    return `
      <div class="gb-balloon">
        <div class="gb-balloon__type">${TYPE_LABEL[pier.category] || ''}</div>
        <div class="gb-balloon__name">${esc(pier.name)}</div>
        ${pier.metro ? `<div class="gb-balloon__metro">М ${esc(pier.metro)}</div>` : ''}
        <div class="gb-balloon__actions">${actions}</div>
      </div>`;
  }

  /* ---------- построение причалов ---------- */

  function buildPlacemarks() {
    placemarks.forEach(p => map.geoObjects.remove(p));
    placemarks = [];

    piersData.piers
      .filter(p => currentFilter === 'all' || p.category === currentFilter)
      .forEach(pier => {
        const pm = new ymaps.Placemark(
          pier.coords,
          {
            balloonContent: balloonHTML(pier),
            hintContent: pier.name
          },
          {
            iconLayout: 'default#image',
            iconImageHref: PIN_ICON,
            iconImageSize: [40, 50],
            iconImageOffset: [-20, -50]   // остриё пина указывает в точку
          }
        );
        placemarks.push(pm);
        map.geoObjects.add(pm);
      });
  }

  /* ---------- достопримечательности (свой слой) ---------- */
  // Эрмитаж, Исаакий и т.д. уже есть на тайлах Яндекса, но можно подсветить:
  function buildLandmarks() {
    if (!piersData.landmarks) return;
    piersData.landmarks.forEach(l => {
      const pm = new ymaps.Placemark(
        l.coords,
        { hintContent: l.name },
        { preset: 'islands#grayDotIcon', iconColor: '#0B1220' }
      );
      map.geoObjects.add(pm);
    });
  }

  /* ---------- геолокация пользователя ---------- */

  function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        userCoords = [pos.coords.latitude, pos.coords.longitude];
        // маркер "Вы здесь"
        const me = new ymaps.Placemark(
          userCoords,
          { hintContent: 'Вы здесь' },
          { preset: 'islands#blueCircleDotIcon', iconColor: '#2C72C4' }
        );
        map.geoObjects.add(me);
        map.setCenter(userCoords, 14, { duration: 600 });
        renderNearest();
      },
      () => { /* пользователь отказал — просто оставляем центр СПб */ },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // список ближайших причалов (если на странице есть контейнер #nearest)
  function renderNearest() {
    const box = document.getElementById('nearest');
    if (!box || !userCoords) return;
    const sorted = piersData.piers
      .map(p => ({ ...p, dist: distanceKm(userCoords, p.coords) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
    box.innerHTML = sorted.map(p =>
      `<button class="gb-near" data-coords="${p.coords.join(',')}">
         <b>${esc(p.name)}</b><span>${p.dist.toFixed(1)} км</span>
       </button>`).join('');
    box.querySelectorAll('.gb-near').forEach(btn => {
      btn.addEventListener('click', () => {
        const c = btn.dataset.coords.split(',').map(Number);
        map.setCenter(c, 16, { duration: 500 });
      });
    });
  }

  /* ---------- фильтры по типу судна ---------- */

  function bindFilters() {
    document.querySelectorAll('[data-map-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-map-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.mapFilter;
        buildPlacemarks();
      });
    });
  }

  /* ---------- инициализация ---------- */

  function initMap() {
    map = new ymaps.Map('map', {
      center: piersData.meta.center,
      zoom: 13,
      controls: ['zoomControl', 'geolocationControl']
    }, {
      suppressMapOpenBlock: true
    });

    buildLandmarks();
    buildPlacemarks();
    bindFilters();
    locateUser();
  }

  // грузим данные, затем ждём готовности API
  fetch('data/piers.json')
    .then(r => r.json())
    .then(data => {
      piersData = data;
      if (window.ymaps) ymaps.ready(initMap);
      else console.error('Yandex Maps API не загружен — проверьте ключ в index.html');
    })
    .catch(e => console.error('Не удалось загрузить data/piers.json', e));
})();
