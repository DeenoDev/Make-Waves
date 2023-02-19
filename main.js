let ctx;

function buildChannel(element) {
  const source = ctx.createMediaElementSource(element);
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  return function connectChannel(merger) {
    source.connect(gain).connect(pan).connect(merger).connect(ctx.destination);
    return {
      isPlaying: () => element.playing,
      play: () => {
        if (element.playing) return;
        element.play();
      },
      gain: (value) => (gain.gain.value = value),
      pan: (value) => (pan.pan.value = value),
    };
  };
}

function randomRunner() {
  const audioElements = document.querySelectorAll('audio');
  const mixer = ctx.createChannelMerger(audioElements.length);
  const channels = Array.from(audioElements).map((audioElement) => {
    return buildChannel(audioElement)(mixer);
  });
  return function player() {
    const control = channels[(Math.random() * channels.length) | 0];
    if (control.isPlaying()) return player();
    control.gain(0.5 * Math.random() + 0.1);
    control.pan(2 * Math.random() - 1);
    control.play();
  };
}

let runner;
const player = document.querySelector('button.player');
player && player.addEventListener('click', (e) => {
  if (e.target.dataset.state === 'stop') {
    e.target.dataset.state = 'play';
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (!runner) {
      runner = randomRunner();
    }
    ctx.resume();
    return;
  }
  e.target.dataset.state = 'stop';
  ctx.suspend();
});

let mouseX;
let mouseY;

let width;
let height;
width = window.innerWidth;
height = window.innerHeight;

mouseX = 0;
mouseY = height / 2;

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
});

window.addEventListener('mousemove', (e) => {
  mouseX = e.x;
  mouseY = e.y;
});

function buildAnimator(...fns) {
  let frame = 0;
  return function update(frameLimit = 1) {
    if (frame % frameLimit == 0) {
      fns.forEach((fn) => {
        fn(frame);
      });
    }
    frame = requestAnimationFrame(() => update(frameLimit));
    return function cancel() {
      cancelAnimationFrame(frame);
    };
  };
}
const circle = document.querySelector('.circle');
const circleContainer = document.querySelector('.circle-generator');

function generateId() {
  return Math.random().toString(16).slice(1).slice(-8);
}
function buildCircleGenerator(container) {
  const circles = [];
  const createCircle = () => {
    const circle = document.createElement('div');
    circle.classList.add('circle');
    circle.setAttribute('data-id', generateId());
    container.appendChild(circle);
    return circle;
  };
  function addCircle(elementBuilderFn) {
    const el = createCircle();
    const fn = elementBuilderFn(el);
    circles.push({ el, fn });
    return circles;
  }
  function getCircles() {
    return circles;
  }
  function removeCircle(index) {
    circles.splice(index, 1);
  }
  return {
    addCircle,
    getCircles,
    removeCircle,
  };
}

function generateInitialConditions() {
  return {
    radius: (t) => t * 500,
    delta: (t) => 100 * t * t + 10,
    transfer: (t) => 0.5 * (1 / (20 * t * t + 1)),
    frequency: 5 * Math.random() + 0.5,
  };
}

function buildWaveFront(
  element,
  initialConditions = {
    radius: (t) => t * 500,
    delta: (t) => 150 * t * t + 10,
    transfer: (t) => 1 / (0.1 * t * t + 1000),
    frequency: 1,
  }
) {
  const speed = (t) => t / 1000;
  const { radius, delta, transfer, frequency } = initialConditions;
  let initialFrame;
  let x;
  let y;
  return function waveFront(t) {
    if (!initialFrame) {
      initialFrame = t;
      x = mouseX + (150 * Math.random() - 75);
      y = mouseY + (150 * Math.random() - 75);
    }
    const [rad, del, trans, freq] = [
      radius(speed(t - initialFrame)),
      delta(speed(t - initialFrame)),
      transfer(speed(t - initialFrame)),
      frequency,
    ];
    if (trans > 0.1) {
      element.style = `--wavefront-radius:${
        (rad / 2) * freq
      }%; --wavefront-delta: ${del / (freq + 0.5)}%; --wavefront-intensity: ${
        trans / ((freq * freq + 0.5) / freq)
      }; --wavefront-x-pos: ${x}px; --wavefront-y-pos: ${y}px`;
      return true;
    }
    return false;
  };
}

function buildCreateWaves(containerElement) {
  const generator = buildCircleGenerator(containerElement);
  const CHANCE = 0.1;
  const WAVES_LIMIT = 5;
  return function waves(t) {
    const random = Math.random();
    if (random <= CHANCE) {
      generator.getCircles().length <= WAVES_LIMIT &&
        generator.addCircle((el) =>
          buildWaveFront(el, generateInitialConditions())
        ) &&
        Math.random() <= 0.75 &&
        runner &&
        runner();
    }
    if (generator.getCircles().length === 0) return;
    generator.getCircles().forEach((cir, index) => {
      if (!cir.fn) return;
      const res = cir.fn(t, t);
      if (!res) {
        containerElement.removeChild(cir.el);
        generator.removeCircle(index);
      }
    });
  };
}

const background = document.body;
const cycleBackground = (t) => {
  document.body.style = `--g1-angle: ${
    33 * Math.sin(t / 500) - 15
  }deg; --g2-angle: ${-67 * Math.cos(-t / 245) + 30}deg`;
};

const updater = buildAnimator(
  buildCreateWaves(circleContainer),
  cycleBackground
);
const cancel = updater();
