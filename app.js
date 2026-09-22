"use strict";

function init() {
  const video = document.getElementById("camera");
  const alien = document.getElementById("alien");
  const startButton = document.getElementById("startButton");
  const shootButton = document.getElementById("shootButton");
  const resultCanvas = document.getElementById("resultCanvas");
  const resultImage = document.getElementById("resultImage");
  const statusText = document.getElementById("statusText");

  if (
    !video ||
    !alien ||
    !startButton ||
    !shootButton ||
    !resultCanvas ||
    !resultImage ||
    !statusText
  ) {
    alert(
      "HTMLのidを確認してください。\n" +
      "camera / alien / startButton / shootButton / " +
      "resultCanvas / resultImage / statusText が必要です。"
    );
    return;
  }

  let stream = null;
  let starting = false;
  let isAlienVisible = false;
  let appearTimer = null;
  let blinkTimer = null;
  let openEyesTimer = null;
  let floatAnimation = null;
  let eyesClosed = false;

  const openImage = new Image();
  const closedImage = new Image();

  // 2枚の画像を先に読み込む
  function loadImage(image, path) {
    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(
        new Error(`画像が読み込めません：${path}`)
      );
      image.src = path;
    });
  }

  const imagesReady = Promise.all([
    loadImage(openImage, "assets/alien-open.png"),
    loadImage(closedImage, "assets/alien-closed.png")
  ]).then(
    () => ({ ok: true }),
    (error) => ({ ok: false, error })
  );

  // スマホでページ内再生するための設定
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");

  // 宇宙人は最初は表示しない
  alien.hidden = true;
  alien.style.display = "none";
  alien.style.pointerEvents = "none";

  shootButton.style.display = "none";
  resultCanvas.style.display = "none";
  resultImage.style.display = "none";

  startButton.addEventListener("click", startCamera);
  shootButton.addEventListener("click", takePhoto);

  async function startCamera() {
    if (starting || stream) return;

    starting = true;
    startButton.disabled = true;
    statusText.textContent = "カメラを準備しています…";

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "カメラを利用できません。HTTPSのサイトをSafariなどで開いてください。"
        );
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" }
        },
        audio: false
      });

      video.srcObject = stream;
      await video.play();

      startButton.style.display = "none";
      shootButton.style.display = "inline-block";
      statusText.textContent = "3秒後に宇宙人が現れるよ！";

      // 画像判定はせず、3秒後に表示
      appearTimer = window.setTimeout(async () => {
        appearTimer = null;

        const result = await imagesReady;

        if (!stream) return;

        if (!result.ok) {
          statusText.textContent = result.error.message;
          return;
        }

        showAlien();
      }, 3000);
    } catch (error) {
      console.error(error);

      stopCamera();

      statusText.textContent =
        error.name === "NotAllowedError"
          ? "カメラの使用を許可して、もう一度試してください。"
          : `カメラを開けませんでした：${error.message}`;
    } finally {
      starting = false;
      startButton.disabled = false;
    }
  }

  function showAlien() {
    if (isAlienVisible) return;

    isAlienVisible = true;
    eyesClosed = false;

    alien.src = openImage.src;
    alien.hidden = false;
    alien.classList.add("show");

    // 既存のCSSに依存せず、カメラの上に表示する
    Object.assign(alien.style, {
      display: "block",
      position: "fixed",
      left: "50%",
      top: "42%",
      width: "min(48vw, 280px)",
      height: "auto",
      maxWidth: "none",
      maxHeight: "none",
      opacity: "1",
      visibility: "visible",
      zIndex: "1000",
      animation: "none",
      transition: "none",
      transform: "translate(-50%, -50%)"
    });

    // ふよふよ浮かぶアニメーション
    floatAnimation = alien.animate(
      [
        { transform: "translate(-50%, -50%) translateY(0px)" },
        { transform: "translate(-50%, -50%) translateY(-18px)" },
        { transform: "translate(-50%, -50%) translateY(0px)" }
      ],
      {
        duration: 2600,
        iterations: Infinity,
        easing: "ease-in-out"
      }
    );

    statusText.textContent = "宇宙人が現れた！一緒に写真を撮ろう";
    startBlinking();
  }

  function startBlinking() {
    clearInterval(blinkTimer);
    clearTimeout(openEyesTimer);

    blinkTimer = window.setInterval(() => {
      if (!isAlienVisible) return;

      eyesClosed = true;
      alien.src = closedImage.src;

      openEyesTimer = window.setTimeout(() => {
        if (!isAlienVisible) return;

        eyesClosed = false;
        alien.src = openImage.src;
      }, 180);
    }, 2400);
  }

  function takePhoto() {
    if (!video.videoWidth || !video.videoHeight) {
      statusText.textContent = "カメラの準備ができるまで待ってね。";
      return;
    }

    const ctx = resultCanvas.getContext("2d");

    if (!ctx) {
      statusText.textContent = "写真を作成できませんでした。";
      return;
    }

    const videoRect = video.getBoundingClientRect();

    if (!videoRect.width || !videoRect.height) {
      statusText.textContent = "カメラ映像が表示されていません。";
      return;
    }

    // 表示中のカメラと同じ縦横比で写真を作る
    const scale = Math.min(
      2,
      1600 / Math.max(videoRect.width, videoRect.height)
    );

    resultCanvas.width = Math.round(videoRect.width * scale);
    resultCanvas.height = Math.round(videoRect.height * scale);

    const width = resultCanvas.width;
    const height = resultCanvas.height;
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    const fit = getComputedStyle(video).objectFit;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // CSSがobject-fit: coverの場合は中央を切り抜く
    if (fit === "cover") {
      const ratio = Math.max(
        width / sourceWidth,
        height / sourceHeight
      );

      const cropWidth = width / ratio;
      const cropHeight = height / ratio;

      ctx.drawImage(
        video,
        (sourceWidth - cropWidth) / 2,
        (sourceHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        width,
        height
      );
    } else if (fit === "contain") {
      const ratio = Math.min(
        width / sourceWidth,
        height / sourceHeight
      );

      const drawWidth = sourceWidth * ratio;
      const drawHeight = sourceHeight * ratio;

      ctx.drawImage(
        video,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // 今表示されている位置で宇宙人を合成
    if (isAlienVisible) {
      const alienRect = alien.getBoundingClientRect();
      const scaleX = width / videoRect.width;
      const scaleY = height / videoRect.height;
      const currentImage = eyesClosed ? closedImage : openImage;

      ctx.drawImage(
        currentImage,
        (alienRect.left - videoRect.left) * scaleX,
        (alienRect.top - videoRect.top) * scaleY,
        alienRect.width * scaleX,
        alienRect.height * scaleY
      );
    }

    resultImage.src = resultCanvas.toDataURL("image/png");
    resultImage.hidden = false;
    resultImage.style.display = "block";
    resultImage.style.maxWidth = "100%";
    resultImage.style.height = "auto";
    resultImage.alt = "宇宙人と一緒に撮った写真";

    statusText.textContent =
      "撮影できたよ！下の写真を長押しして保存してね。";
  }

  function stopCamera() {
    clearTimeout(appearTimer);
    clearInterval(blinkTimer);
    clearTimeout(openEyesTimer);

    floatAnimation?.cancel();
    floatAnimation = null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    video.srcObject = null;
    isAlienVisible = false;
    eyesClosed = false;

    alien.hidden = true;
    alien.style.display = "none";
    alien.classList.remove("show");

    startButton.style.display = "inline-block";
    startButton.disabled = false;
    shootButton.style.display = "none";
  }

  window.addEventListener("pagehide", stopCamera);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
