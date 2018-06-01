this.snapcraft = this.snapcraft || {};
this.snapcraft.public = (function (exports) {
'use strict';

/* global d3, topojson */

function renderMap(el, snapData) {
  const mapEl = d3.select(el);

  d3.queue().defer(d3.json, "/static/js/world-110m.v1.json").await(ready);

  function render(mapEl, snapData, world) {
    const width = mapEl.property('clientWidth');
    const height = width * 0.5;
    // some offset position center of the map properly
    const offset = width * 0.1;

    const projection = d3.geoNaturalEarth1().scale(width * 0.2).translate([width / 2, (height + offset) / 2]).precision(.1);

    // rotate not to split Asia
    projection.rotate([-10, 0]);

    const path = d3.geoPath().projection(projection);

    // clean up HTML before rendering map
    mapEl.html('');

    const svg = mapEl.append("svg").attr("width", width).attr("height", height);

    const tooltip = mapEl.append("div").attr("class", "snapcraft-territories__tooltip u-no-margin");

    const tooltipMsg = tooltip.append("div").attr("class", "p-tooltip__message");

    const countries = topojson.feature(world, world.objects.countries).features;

    const g = svg.append("g");
    const country = g.selectAll(".snapcraft-territories__country").data(countries);

    country.enter().insert("path").attr("class", countryData => {
      const countrySnapData = snapData[countryData.id];

      if (countrySnapData) {
        return `snapcraft-territories__country snapcraft-territories__country-default`;
      }

      return 'snapcraft-territories__country';
    }).attr("style", countryData => {
      const countrySnapData = snapData[countryData.id];

      if (countrySnapData) {
        if (countrySnapData.color_rgb) {
          return 'fill: rgb(' + countrySnapData.color_rgb[0] + ',' + countrySnapData.color_rgb[1] + ',' + countrySnapData.color_rgb[2] + ')';
        }
      }
    }).attr("d", path).attr("id", function (d) {
      return d.id;
    }).attr("title", function (d) {
      return d.properties.name;
    }).on("mousemove", countryData => {
      const pos = d3.mouse(mapEl.node());
      const countrySnapData = snapData[countryData.id];

      if (countrySnapData) {
        tooltip.style('top', pos[1] + 'px').style('left', pos[0] + 'px').style('display', 'block');

        let content = ['<span class="u-no-margin--top">', countrySnapData.name];
        if (countrySnapData['number_of_users'] !== undefined) {
          content.push(`<br />${countrySnapData['number_of_users']} active`);
        }
        content.push('</span>');
        tooltipMsg.html(`<span
               class="snapcraft-territories__swatch"
               style="background-color: rgb(${countrySnapData.color_rgb[0]}, ${countrySnapData.color_rgb[1]}, ${countrySnapData.color_rgb[2]})"></span>
             ${content.join(' ')}`);
      }
    }).on("mouseout", function () {
      tooltip.style('display', 'none');
    });

    g.append("path").datum(topojson.mesh(world, world.objects.countries, function (a, b) {
      return a !== b;
    })).attr("class", "snapcraft-territories__boundary").attr("d", path);
  }

  function ready(error, world) {
    if (error) {
      // let sentry catch it, so we get notified why it fails
      throw error;
    }

    render(mapEl, snapData, world);

    let resizeTimeout;

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        render(mapEl, snapData, world);
      }, 100);
    });
  }
}

function openLightbox(url, images) {
  const lightboxEl = initLightboxEl(images);

  openLightboxEl(lightboxEl, url, images);
}

const lightboxTpl = `
  <div class="vbox-preloader">Loading...</div>
  <div class="vbox-container">
    <div class="vbox-content">
      <img class="figlio" >
    </div>
  </div>

  <div class="vbox-title" style="display: none;"></div>
  <div class="vbox-num" style="display: none;">0/0</div>
  <div class="vbox-close">X</div>
  <button class="vbox-next">next</button>
  <button class="vbox-prev">prev</button>
`;

const initLightboxEl = () => {
  const lightboxEl = document.createElement('div');
  lightboxEl.className = 'vbox-overlay';
  lightboxEl.style.display = 'none';
  lightboxEl.style.display = '0';
  lightboxEl.innerHTML = lightboxTpl;

  // adjust positioning when image loads
  const contentEl = lightboxEl.querySelector('.vbox-content');
  const lightboxImgEl = lightboxEl.querySelector('.vbox-content img');

  lightboxImgEl.addEventListener('load', () => {
    contentEl.style.opacity = "1";
  });

  const closeLightbox = event => {
    event.preventDefault();
    closeLightboxEl(lightboxEl);
  };

  lightboxEl.querySelector('.vbox-close').addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', event => {
    const ignore = ['figlio', 'vbox-next', 'vbox-prev'];
    // This assumes a single class on each item
    if (ignore.indexOf(event.target.className) < 0) {
      closeLightbox(event);
    }
  });

  return lightboxEl;
};

const loadLightboxImage = (lightboxEl, url, images) => {
  // hide content before it loads
  lightboxEl.querySelector('.vbox-content').style.opacity = "0";

  // load image
  lightboxEl.querySelector('.vbox-content img').src = url;

  // update prev/next buttons
  if (images && images.length) {
    const imageIndex = images.indexOf(url);

    if (imageIndex > 0) {
      lightboxEl.querySelector('.vbox-prev').removeAttribute('disabled');
      lightboxEl.querySelector('.vbox-prev').dataset.url = images[imageIndex - 1];
    } else {
      lightboxEl.querySelector('.vbox-prev').setAttribute('disabled', 'disabled');
      lightboxEl.querySelector('.vbox-prev').dataset.url = null;
    }

    if (imageIndex < images.length - 1) {
      lightboxEl.querySelector('.vbox-next').removeAttribute('disabled');
      lightboxEl.querySelector('.vbox-next').dataset.url = images[imageIndex + 1];
    } else {
      lightboxEl.querySelector('.vbox-next').setAttribute('disabled', 'disabled');
      lightboxEl.querySelector('.vbox-next').dataset.url = null;
    }
  }
};

const openLightboxEl = (lightboxEl, url, images) => {
  // prepare navigating to next/prev images
  if (images && images.length) {
    const handleNextPrevClick = event => {
      event.preventDefault();
      if (event.target.dataset.url) {
        loadLightboxImage(lightboxEl, event.target.dataset.url, images);
      }
    };

    const handleNextPrevKey = event => {
      const KEYS = {
        ESC: 27,
        LEFT: 37,
        RIGHT: 39
      };
      let image;
      switch (event.keyCode) {
        case KEYS.ESC:
          closeLightboxEl(lightboxEl);
          break;
        case KEYS.LEFT:
          image = lightboxEl.querySelector('.vbox-prev').dataset.url;
          if (image !== 'null') {
            loadLightboxImage(lightboxEl, image, images);
          }
          break;
        case KEYS.RIGHT:
          image = lightboxEl.querySelector('.vbox-next').dataset.url;
          if (image !== 'null') {
            loadLightboxImage(lightboxEl, image, images);
          }
          break;
      }
    };

    lightboxEl.querySelector('.vbox-next').addEventListener('click', handleNextPrevClick);
    lightboxEl.querySelector('.vbox-prev').addEventListener('click', handleNextPrevClick);
    window.addEventListener('keyup', handleNextPrevKey);
  }

  // open lightbox
  document.body.classList.add('vbox-open');
  document.body.appendChild(lightboxEl);
  lightboxEl.style.opacity = '1';
  lightboxEl.style.display = 'block';

  // load image
  loadLightboxImage(lightboxEl, url, images);
};

const closeLightboxEl = lightboxEl => {
  lightboxEl.style.opacity = '0';
  lightboxEl.style.display = 'none';
  if (lightboxEl.parentNode) {
    lightboxEl.parentNode.removeChild(lightboxEl);
  }
  document.body.classList.remove('vbox-open');
};

const lightbox = {
  openLightbox
};

function initScreenshots(screenshotsId) {
  const screenshotsEl = document.querySelector(screenshotsId);

  if (!screenshotsEl) {
    return;
  }

  const images = Array.from(screenshotsEl.querySelectorAll('img')).map(image => image.src);

  screenshotsEl.addEventListener('click', event => {
    const url = event.target.src;

    if (url) {
      lightbox.openLightbox(url, images);
    }
  });

  // wrap screenshots in additional container to allow changing position
  // inside of overflow hidden container
  const wrapper = screenshotsEl.querySelector('.p-screenshots__wrapper');
  const container = document.createElement('div');
  container.className = 'p-screenshots__container';
  screenshotsEl.appendChild(container);
  container.appendChild(wrapper);

  // add buttons to change position of screenshots
  const next = document.createElement('button');
  next.className = 'p-screenshots__next';
  next.innerHTML = 'next';

  const prev = document.createElement('button');
  prev.className = 'p-screenshots__prev';
  prev.innerHTML = 'previous';

  screenshotsEl.appendChild(next);
  screenshotsEl.appendChild(prev);

  // get table of offsets for all screenshots
  let offsets = Array.from(screenshotsEl.querySelectorAll('.p-screenshot')).map(screenshot => screenshot.offsetLeft);

  let current = 0;

  function setCurrent(n) {
    // update offsets in case images finished loading after init
    offsets = Array.from(screenshotsEl.querySelectorAll('.p-screenshot')).map(screenshot => screenshot.offsetLeft);

    current = n;
    wrapper.style.left = `-${offsets[n]}px`;

    // update buttons based on current screenshot
    if (current === 0) {
      prev.disabled = 'disabled';
    } else {
      prev.disabled = false;
    }

    if (current === offsets.length - 1) {
      next.disabled = 'disabled';
    } else {
      next.disabled = false;
    }
  }

  setCurrent(0);

  next.addEventListener('click', event => {
    event.preventDefault();
    if (current < offsets.length - 1) {
      setCurrent(current + 1);
    }
  });
  prev.addEventListener('click', event => {
    event.preventDefault();
    if (current > 0) {
      setCurrent(current - 1);
    }
  });
}

/* global ga */

const LATEST = 'latest';

function setTrack(arch, track, packageName, channelMap) {
  ['stable', 'candidate', 'beta', 'edge'].forEach((risk, i, risks) => {
    const channelEl = document.getElementById(`js-channel-map-${risk}`);

    // channel names in tracks other then latest are prefixed with track name
    const channelName = track === LATEST ? risk : `${track}/${risk}`;

    channelEl.querySelector('.js-channel-name').innerHTML = channelName;
    let channelData = channelMap[channelName];

    // update install instructions
    let command = `sudo snap install ${packageName}`;

    if (track === LATEST) {
      if (risk !== 'stable') {
        command += ` --${risk}`;
      }
    } else {
      command += ` --channel=${track}/${risk}`;
    }

    channelEl.querySelector('input').value = command;

    const versionEl = channelEl.querySelector('.p-form-help-text');
    channelEl.classList.remove('p-channel-map__row--closed');

    // show version
    if (channelData) {
      versionEl.innerHTML = `Version: ${channelData.version}`;
    } else {
      let fallbackRisk;
      for (let j = 0; j < i; j++) {
        const channelName = track === LATEST ? risks[j] : `${track}/${risks[j]}`;
        if (channelMap[channelName]) {
          fallbackRisk = risks[j];
        }
      }

      if (fallbackRisk) {
        versionEl.innerHTML = `No release in ${risk} channel, using ${fallbackRisk} release.`;
      } else {
        versionEl.innerHTML = `No release in ${risk} channel.`;
        channelEl.classList.add('p-channel-map__row--closed');
      }
    }
  });
}

function getArchTrackChannels(arch, track, channelMapData) {
  const channels = channelMapData[arch][track];
  const archTrackChannels = {};

  channels.forEach(channel => {
    archTrackChannels[channel.channel] = channel;
  });

  return archTrackChannels;
}

function setArchitecture(arch, packageName, channelMapData) {
  if (!arch) {
    return;
  }

  const tracks = Object.keys(channelMapData[arch]);

  // sort tracks alphabetically with 'latest' always first
  tracks.sort((a, b) => {
    if (a === LATEST) {
      return -1;
    }
    if (b === LATEST) {
      return 1;
    }
    return a <= b ? -1 : 1;
  });

  // by default take first track (which should be 'latest')
  const track = tracks[0];

  if (!track) {
    return;
  }

  // update tracks select
  const trackSelect = document.getElementById("js-channel-map-track-select");
  trackSelect.innerHTML = tracks.map(track => `<option value="${track}">${track}</option>`).join('');
  trackSelect.value = track;

  // hide tracks if there is only one
  if (tracks.length === 1) {
    trackSelect.closest('.js-channel-map-track-field').style.display = 'none';
  } else {
    trackSelect.closest('.js-channel-map-track-field').style.display = '';
  }

  const channelMap = getArchTrackChannels(arch, track, channelMapData);
  setTrack(arch, track, packageName, channelMap);
}

function selectTab(tabEl, tabsWrapperEl) {
  const selected = tabEl.getAttribute('aria-selected');
  if (!selected) {
    tabsWrapperEl.querySelector('.p-channel-map__tab.is-open').classList.remove('is-open');
    tabsWrapperEl.querySelector('.p-tabs__link[aria-selected]').removeAttribute('aria-selected');

    document.getElementById(tabEl.getAttribute('aria-controls')).classList.add('is-open');
    tabEl.setAttribute('aria-selected', "true");
  }
}

function initTabs(el) {
  el.addEventListener('click', event => {
    const target = event.target.closest('.p-tabs__link');

    if (target) {
      event.preventDefault();
      selectTab(target, el);
    }
  });
}

function initOpenSnapButtons() {
  let attempt = 1;

  document.addEventListener('click', event => {
    const openButton = event.target.closest('.js-open-snap-button');

    if (openButton) {
      const name = openButton.dataset.snap;
      let iframe = document.querySelector('.js-snap-open-frame');

      if (iframe) {
        iframe.parentNode.removeChild(iframe);
      }

      iframe = document.createElement('iframe');
      iframe.className = 'js-snap-open-frame';
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.src = `snap://${name}`;
      document.body.appendChild(iframe);

      if (typeof ga !== 'undefined') {
        // The first attempt should be counted towards the 'intent'
        let label = 'Snap install intent';
        let value = `${name}`;

        // Subsequent attempts should still be tracked, but not as 'intent'
        if (attempt > 1) {
          label = 'Snap install click';
          value += ` - click ${attempt}`;
        }

        ga('gtm1.send', {
          hitType: 'event',
          eventCategory: 'Snap details',
          eventAction: 'Click view in desktop store button',
          eventLabel: label,
          eventValue: value
        });
      }

      attempt += 1;
    }
  });
}

function initChannelMap(el, packageName, channelMapData) {
  initOpenSnapButtons();

  const channelMapEl = document.querySelector(el);
  const channelOverlayEl = document.querySelector('.p-channel-map-overlay');

  initTabs(channelMapEl);

  let closeTimeout;

  // init open/hide buttons
  const openChannelMap = event => {
    const openButton = event.target.closest('.js-open-channel-map');

    if (openButton) {
      // open tab based on button click (or install tab by default)
      const openTabName = openButton.getAttribute('aria-controls') || 'channel-map-tab-install';

      // clear hiding animation if it's still running
      clearTimeout(closeTimeout);

      const openTab = channelMapEl.querySelector(`.p-tabs__link[aria-controls=${openTabName}]`);

      // select default tab before opening
      selectTab(openTab, channelMapEl);

      // make sure overlay is displayed before CSS transitions are triggered
      channelOverlayEl.style.display = 'block';
      setTimeout(() => channelMapEl.classList.remove('is-closed'), 10);

      window.addEventListener('keyup', hideOnEscape);
      document.addEventListener('click', hideOnClick);

      if (typeof ga !== 'undefined') {
        ga('gtm1.send', {
          hitType: 'event',
          eventCategory: 'Snap details',
          eventAction: 'Open install dialog',
          eventLabel: `Open ${openTabName} dialog tab for ${packageName} snap`
        });
      }
    }
  };

  const hideChannelMap = () => {
    channelMapEl.classList.add('is-closed');
    // hide overlay after CSS transition is finished
    closeTimeout = setTimeout(() => channelOverlayEl.style.display = 'none', 500);

    window.removeEventListener('keyup', hideOnEscape);
    document.removeEventListener('click', hideOnClick);
  };

  const hideOnEscape = event => {
    if (event.key === "Escape" && !channelMapEl.classList.contains('is-closed')) {
      hideChannelMap();
    }
  };

  const hideOnClick = event => {
    // when channel map is not closed and clicking outside of it, close it
    if (!channelMapEl.classList.contains('is-closed') && !event.target.closest(el)) {
      hideChannelMap();
    }
  };

  // show/hide when clicking on buttons
  document.addEventListener('click', openChannelMap);
  document.querySelector('.js-hide-channel-map').addEventListener('click', hideChannelMap);

  // get architectures from data
  const architectures = Object.keys(channelMapData);

  // initialize arch and track selects
  const archSelect = document.getElementById("js-channel-map-architecture-select");
  const trackSelect = document.getElementById("js-channel-map-track-select");

  archSelect.innerHTML = architectures.map(arch => `<option value="${arch}">${arch}</option>`).join('');

  archSelect.addEventListener('change', () => {
    setArchitecture(archSelect.value, packageName, channelMapData);
  });

  trackSelect.addEventListener('change', () => {
    const channels = getArchTrackChannels(archSelect.value, trackSelect.value, channelMapData);
    setTrack(archSelect.value, trackSelect.value, packageName, channels);
  });

  const arch = channelMapData['amd64'] ? 'amd64' : architectures[0];
  archSelect.value = arch;
  setArchitecture(arch, packageName, channelMapData);
}

exports.map = renderMap;
exports.screenshots = initScreenshots;
exports.channelMap = initChannelMap;

return exports;

}({}));
//# sourceMappingURL=public.js.map
