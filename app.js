// ========================================
// HTML要素の取得
// ========================================

const app = document.querySelector(".app");

const camera = document.getElementById("camera");
const detectCanvas = document.getElementById("detectCanvas");

const startScreen = document.getElementById("startScreen");
const cameraScreen = document.getElementById("cameraScreen");
const resultScreen = document.getElementById("resultScreen");

const startButton = document.getElementById("startButton");
const closeButton = document.getElementById("closeButton");
const shutterButton = document.getElementById("shutterButton");
const retryButton = document.getElementById("retryButton");
const saveButton = document.getElementById("saveButton");

const finder = document.getElementById("finder");

const status = document.getElementById("status");
const statusText = document.getElementById("statusText");

const alien = document.getElementById("alien");
const alienImage = document.getElementById("alienImage");

const shutterMessage = document.getElementById("shutterMessage");

const resultImage = document.getElementById("resultImage");
const errorMessage = document.getElementById("errorMessage");


// ========================================
// 画像ファイルの場所
// ========================================

const openEyesImage = "./assets/alien-open.png";
const closedEyesImage = "./assets/alien-closed.png";


// ========================================
// Canvasの設定
// ========================================

const detectContext = detectCanvas.getContext(
  "2d",
  {
    willReadFrequently: true
  }
);


// ========================================
// 状態を管理する変数
// ========================================

// スマホのカメラ映像
let cameraStream = null;

// 宇宙人を探す処理
let detectionTimer = null;

// 瞬きの処理
let blinkTimer = null;

// 判定の安定度
let detectionScore = 0;

// 宇宙人を発見しているか
let alienFound = false;

// 現在瞬きしているか
let blinking = false;


// ========================================
// エラーメッセージを表示
// ========================================

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;

  setTimeout(() => {
    errorMessage.hidden = true;
  }, 5000);
}


// ========================================
// カメラを起動する
// ========================================

async function startCamera() {
  // カメラ機能が使えない場合
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    showError(
      "このブラウザではカメラを使用できません。SafariまたはChromeで開いてください。"
    );

    return;
  }

  try {
    cameraStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          // 背面カメラを優先する
          facingMode: {
            ideal: "environment"
          },

          width: {
            ideal: 1920
          },

          height: {
            ideal: 1080
          }
        },

        // 音声は使用しない
        audio: false
      });

    // video要素にカメラ映像を設定
    camera.srcObject = cameraStream;

    await camera.play();

    // スタート画面を非表示
    startScreen.hidden = true;

    // カメラ画面を表示
    cameraScreen.hidden = false;

    // 約0.25秒ごとに宇宙人を探す
    detectionTimer = setInterval(
      detectAlien,
      250
    );
  } catch (error) {
    console.error(error);

    showError(
      "カメラを開けませんでした。ブラウザの設定からカメラの使用を許可してください。"
    );
  }
}


// ========================================
// カメラを終了する
// ========================================

function stopCamera() {
  // 画像認識を停止
  clearInterval(detectionTimer);

  // 瞬きを停止
  clearTimeout(blinkTimer);

  // カメラを停止
  if (cameraStream) {
    cameraStream
      .getTracks()
      .forEach((track) => {
        track.stop();
      });
  }

  cameraStream = null;
  camera.srcObject = null;

  // 宇宙人を非表示に戻す
  changeAlienFoundState(false);

  // 画面を切り替える
  cameraScreen.hidden = true;
  resultScreen.hidden = true;
  startScreen.hidden = false;
}


// ========================================
// カメラ中央の色を調べる
// ========================================

function detectAlien() {
  // カメラ映像が準備できていない場合
  if (
    camera.videoWidth === 0 ||
    camera.videoHeight === 0
  ) {
    return;
  }

  // 判定用画像の大きさ
  const canvasSize = 96;

  detectCanvas.width = canvasSize;
  detectCanvas.height = canvasSize;

  /*
    カメラ映像の中央部分を切り取ります。

    その範囲に宇宙人の画像が入っているか、
    ミント色・黄緑色・白色の割合で判定します。
  */

  const sourceSize =
    Math.min(
      camera.videoWidth,
      camera.videoHeight
    ) * 0.58;

  const sourceX =
    (camera.videoWidth - sourceSize) / 2;

  const sourceY =
    (camera.videoHeight - sourceSize) / 2;

  detectContext.drawImage(
    camera,

    // カメラから切り取る位置
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,

    // Canvasに描画する位置
    0,
    0,
    canvasSize,
    canvasSize
  );

  // Canvas内の色情報を取得
  const imageData =
    detectContext.getImageData(
      0,
      0,
      canvasSize,
      canvasSize
    );

  const pixels = imageData.data;

  let mintColorCount = 0;
  let limeColorCount = 0;
  let whiteColorCount = 0;

  const totalPixels = pixels.length / 4;

  // 1ピクセルずつ色を確認
  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];

    /*
      ミント色の判定

      緑が赤より強く、
      青もある程度含まれている色を数えます。
    */

    const isMintColor =
      green > red * 1.18 &&
      green > blue * 1.03 &&
      green > 105 &&
      blue > 65;

    if (isMintColor) {
      mintColorCount++;
    }

    /*
      黄緑色の判定
    */

    const isLimeColor =
      green > 150 &&
      red > 135 &&
      blue < 145 &&
      green > blue * 1.35;

    if (isLimeColor) {
      limeColorCount++;
    }

    /*
      白い背景や白目の判定
    */

    const isWhiteColor =
      red > 185 &&
      green > 185 &&
      blue > 185;

    if (isWhiteColor) {
      whiteColorCount++;
    }
  }

  // 各色が画面内に占める割合
  const mintRatio =
    mintColorCount / totalPixels;

  const limeRatio =
    limeColorCount / totalPixels;

  const whiteRatio =
    whiteColorCount / totalPixels;

  /*
    3種類の色が一定量以上あるとき、
    宇宙人のイラストらしいと判定します。
  */

  const looksLikeAlien =
    mintRatio > 0.11 &&
    limeRatio > 0.012 &&
    whiteRatio > 0.12;

  /*
    一瞬だけ似た色が映っても反応しないように、
    何度か連続して認識した場合のみ表示します。
  */

  if (looksLikeAlien) {
    detectionScore++;
  } else {
    detectionScore--;
  }

  // 0?5の範囲に収める
  detectionScore =
    Math.max(
      0,
      Math.min(5, detectionScore)
    );

  // 3回以上続けて認識したら表示
  if (
    detectionScore >= 3 &&
    !alienFound
  ) {
    changeAlienFoundState(true);
  }

  // 完全に認識しなくなったら非表示
  if (
    detectionScore === 0 &&
    alienFound
  ) {
    changeAlienFoundState(false);
  }
}


// ========================================
// 宇宙人の表示状態を変更
// ========================================

function changeAlienFoundState(found) {
  alienFound = found;

  if (found) {
    // 宇宙人を表示
    alien.classList.add("visible");

    // ガイド枠を薄くする
    finder.style.opacity = "0.22";

    // 撮影ボタンを使用可能にする
    shutterButton.disabled = false;

    // 発見状態のデザイン
    status.classList.add("found");

    statusText.textContent =
      "宇宙人を発見！";

    shutterMessage.textContent =
      "一緒に写真を撮ろう！";

    // 瞬きを開始
    startBlinking();
  } else {
    // 宇宙人を非表示
    alien.classList.remove("visible");

    // ガイド枠を元に戻す
    finder.style.opacity = "1";

    // 撮影ボタンを使用不可にする
    shutterButton.disabled = true;

    // 状態表示を元に戻す
    status.classList.remove("found");

    statusText.textContent =
      "宇宙人を探しています";

    shutterMessage.textContent =
      "宇宙人を見つけると撮影できます";

    // 瞬きを停止
    clearTimeout(blinkTimer);

    blinking = false;

    alienImage.src = openEyesImage;
  }
}


// ========================================
// 宇宙人を瞬きさせる
// ========================================

function startBlinking() {
  clearTimeout(blinkTimer);

  if (!alienFound) {
    return;
  }

  /*
    1.8?4.4秒の間でランダムに瞬きします。
  */

  const waitTime =
    1800 + Math.random() * 2600;

  blinkTimer = setTimeout(() => {
    // 目を閉じる
    blinking = true;

    alienImage.src = closedEyesImage;

    // 170ミリ秒後に目を開ける
    setTimeout(() => {
      blinking = false;

      alienImage.src = openEyesImage;

      // 次の瞬きを予約
      startBlinking();
    }, 170);
  }, waitTime);
}


// ========================================
// object-fit: coverと同じ切り取り位置を計算
// ========================================

function calculateCameraCrop(
  video,
  outputWidth,
  outputHeight
) {
  const videoRatio =
    video.videoWidth / video.videoHeight;

  const outputRatio =
    outputWidth / outputHeight;

  /*
    カメラ映像が横長の場合は、
    左右を切り取ります。
  */

  if (videoRatio > outputRatio) {
    const sourceWidth =
      video.videoHeight * outputRatio;

    return {
      sourceX:
        (video.videoWidth - sourceWidth) / 2,

      sourceY: 0,

      sourceWidth: sourceWidth,

      sourceHeight:
        video.videoHeight
    };
  }

  /*
    カメラ映像が縦長の場合は、
    上下を切り取ります。
  */

  const sourceHeight =
    video.videoWidth / outputRatio;

  return {
    sourceX: 0,

    sourceY:
      (video.videoHeight - sourceHeight) / 2,

    sourceWidth:
      video.videoWidth,

    sourceHeight:
      sourceHeight
  };
}


// ========================================
// 写真を撮影する
// ========================================

async function takePhoto() {
  if (!alienFound) {
    return;
  }

  // 撮影結果を作るCanvas
  const photoCanvas =
    document.createElement("canvas");

  /*
    画像が大きくなりすぎないように、
    横幅は最大1440pxにします。
  */

  const photoWidth =
    Math.min(
      camera.videoWidth,
      1440
    );

  const screenRatio =
    window.innerHeight / window.innerWidth;

  const photoHeight =
    Math.round(
      photoWidth * screenRatio
    );

  photoCanvas.width = photoWidth;
  photoCanvas.height = photoHeight;

  const photoContext =
    photoCanvas.getContext("2d");

  // カメラ映像の切り取り位置
  const crop =
    calculateCameraCrop(
      camera,
      photoWidth,
      photoHeight
    );

  // カメラ映像をCanvasに描画
  photoContext.drawImage(
    camera,

    crop.sourceX,
    crop.sourceY,
    crop.sourceWidth,
    crop.sourceHeight,

    0,
    0,
    photoWidth,
    photoHeight
  );

  /*
    画面上に表示されている宇宙人の
    位置と大きさを取得します。
  */

  const alienPosition =
    alien.getBoundingClientRect();

  const appPosition =
    app.getBoundingClientRect();

  const scaleX =
    photoWidth / appPosition.width;

  const scaleY =
    photoHeight / appPosition.height;

  // 撮影時に表示する宇宙人画像
  const photoAlien =
    new Image();

  photoAlien.src =
    blinking
      ? closedEyesImage
      : openEyesImage;

  // 画像が読み込まれるまで待つ
  await photoAlien.decode();

  // 宇宙人を写真に合成
  photoContext.drawImage(
    photoAlien,

    (alienPosition.left -
      appPosition.left) * scaleX,

    (alienPosition.top -
      appPosition.top) * scaleY,

    alienPosition.width * scaleX,

    alienPosition.height * scaleY
  );

  // CanvasをPNG画像に変換
  const photoData =
    photoCanvas.toDataURL(
      "image/png"
    );

  // 撮影結果を表示
  resultImage.src = photoData;

  // 保存ボタンに画像を設定
  saveButton.href = photoData;

  // 画像認識を一時停止
  clearInterval(detectionTimer);

  // 撮影結果画面へ切り替える
  cameraScreen.hidden = true;
  resultScreen.hidden = false;
}


// ========================================
// 写真を撮り直す
// ========================================

function retryPhoto() {
  // 撮影結果画面を閉じる
  resultScreen.hidden = true;

  // カメラ画面を表示
  cameraScreen.hidden = false;

  // 画像認識を再開
  detectionTimer = setInterval(
    detectAlien,
    250
  );
}


// ========================================
// ボタン操作
// ========================================

// カメラをひらく
startButton.addEventListener(
  "click",
  startCamera
);

// カメラを閉じる
closeButton.addEventListener(
  "click",
  stopCamera
);

// 写真を撮る
shutterButton.addEventListener(
  "click",
  takePhoto
);

// 写真を撮り直す
retryButton.addEventListener(
  "click",
  retryPhoto
);


// ========================================
// ページを閉じたときにカメラを停止
// ========================================

window.addEventListener(
  "pagehide",
  () => {
    if (cameraStream) {
      cameraStream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });
    }
  }
);