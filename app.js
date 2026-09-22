const video = document.getElementById("camera");
const alien = document.getElementById("alien");
const startButton = document.getElementById("startButton");
const shootButton = document.getElementById("shootButton");
const resultCanvas = document.getElementById("resultCanvas");
const resultImage = document.getElementById("resultImage");
const statusText = document.getElementById("statusText");

const openAlienImage = "assets/alien-open.png";
const closedAlienImage = "assets/alien-closed.png";

let stream = null;
let isAlienVisible = false;
let blinkTimer = null;
let detectTimer = null;

startButton.addEventListener("click", startCamera);
shootButton.addEventListener("click", takePhoto);

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      },
      audio: false
    });

    video.srcObject = stream;

    statusText.textContent = "宇宙人のイラストをカメラに向けてね";
    startButton.style.display = "none";
    shootButton.style.display = "inline-block";

    startDetecting();
  } catch (error) {
    console.error(error);
    statusText.textContent = "カメラを開けませんでした。Safariで開いて、カメラを許可してね。";
  }
}

function startDetecting() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  detectTimer = setInterval(() => {
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const width = 160;
    const height = 120;

    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let mintCount = 0;
    let limeCount = 0;
    let whiteCount = 0;
    let greenCount = 0;

    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // 宇宙人のミント色っぽい部分
      if (g > 120 && r > 50 && r < 170 && b > 80 && b < 190) {
        mintCount++;
      }

      // 下の黄緑っぽい部分
      if (g > 150 && r > 120 && b < 120) {
        limeCount++;
      }

      // 背景や目の白っぽい部分
      if (r > 180 && g > 180 && b > 180) {
        whiteCount++;
      }

      // とにかく緑っぽい色
      if (g > r + 20 && g > b + 10 && g > 90) {
        greenCount++;
      }
    }

    const mintRatio = mintCount / totalPixels;
    const limeRatio = limeCount / totalPixels;
    const whiteRatio = whiteCount / totalPixels;
    const greenRatio = greenCount / totalPixels;

    // かなりゆるめの判定
    const looksLikeAlien =
      mintRatio > 0.01 ||
      limeRatio > 0.001 ||
      greenRatio > 0.015 ||
      (whiteRatio > 0.2 && mintRatio > 0.005);

    if (looksLikeAlien) {
      showAlien();
    } else {
      hideAlien();
    }
  }, 300);
}

function showAlien() {
  if (isAlienVisible) return;

  isAlienVisible = true;
  alien.src = openAlienImage;
  alien.classList.add("show");

  statusText.textContent = "宇宙人発見！一緒に写真を撮れるよ";

  startBlinking();
}

function hideAlien() {
  if (!isAlienVisible) return;

  isAlienVisible = false;
  alien.classList.remove("show");

  statusText.textContent = "宇宙人のイラストを探しているよ";

  stopBlinking();
}

function startBlinking() {
  stopBlinking();

  blinkTimer = setInterval(() => {
    alien.src = closedAlienImage;

    setTimeout(() => {
      if (isAlienVisible) {
        alien.src = openAlienImage;
      }
    }, 180);
  }, 2200);
}

function stopBlinking() {
  if (blinkTimer) {
    clearInterval(blinkTimer);
    blinkTimer = null;
  }

  alien.src = openAlienImage;
}

function takePhoto() {
  if (!video.videoWidth || !video.videoHeight) return;

  const canvas = resultCanvas;
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (isAlienVisible) {
    const alienWidth = canvas.width * 0.45;
    const alienHeight = alienWidth;
    const alienX = canvas.width * 0.275;
    const alienY = canvas.height * 0.25;

    ctx.drawImage(alien, alienX, alienY, alienWidth, alienHeight);
  }

  const imageUrl = canvas.toDataURL("image/png");
  resultImage.src = imageUrl;
  resultImage.style.display = "block";

  statusText.textContent = "写真を保存するなら、画像を長押しして保存してね";
}
