// import MP4Box from "mp4box";
const streamWorker = new Worker("worker.js");

async function captureVideo(videoInput) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  videoInput.srcObject = stream;
  videoInput.play();

  return stream;
}

const startCapture = async (track, settings) => {
  // Start capturing frames at 30 fps

  let ts = track.getSettings();
  const processor = new MediaStreamTrackProcessor(track);
  console.log(processor);
  const inputStream = processor.readable;

  console.log(inputStream);

  // Create a MediaStreamTrackGenerator, which exposes a track from a
  // WritableStream of VideoFrames, using non-standard Chrome API.
  const generator = new MediaStreamTrackGenerator({ kind: "video" });
  const outputStream = generator.writable;
  document.getElementById("outputVideo").srcObject = new MediaStream([
    generator,
  ]);

  let ssrcArr = new Uint8Array(1);
  window.crypto.getRandomValues(ssrcArr);
  const ssrc = ssrcArr[0];

  //   const captureStream = new MediaStream();
  //   const videoTrack = captureStream.addTrack(track.clone());
  //   const encoder = new VideoEncoder({
  //     output: (chunk) => {
  //       console.log(chunk);
  //       // Send the encoded chunk to the server (or do something else with it)
  //     },
  //     error: (error) => {
  //       // Handle any encoding errors
  //     },
  //   });
  const options = {
    codec: "avc1.42002A", //H264
    avc: { format: "annexb" },
    pt: 1,
    framerate: 30,
    bitrate: 5000000, // 5Mbps
    height: settings.height,
    width: settings.width,
    ssrc: ssrc,
    bitrateMode: "constant",
    keyInterval: 90, //Set the keyframe interval to 90 frames
  };
  //   config;
  //   config.pt = 1;
  // await encoder.configure(options);
  //   encoder.encode(videoTrack, { startTime: performance.now() });
  streamWorker.postMessage(
    {
      type: "stream",
      config: options,
      streams: { input: inputStream, output: outputStream },
    },
    [inputStream, outputStream]
  );
  // window.docume?nt.get
  streamWorker.addEventListener("message", (info) => {
    console.log("aaaa", info);
    const i = info.data;
    console.log(info.type);
    if (i.type === "data") {
      console.log("dataaa");
      const blob = new Blob([i.data], { type: "video/mp4" });
      const formData = new FormData();
      formData.append("segment", blob, "1_segment-0.mp4");
      console.log("Segment created ");
      console.log("Blob size", blob.size);
      //sendFormDataToServer(formData);
      console.log("Form Data:", formData);

      console.log("bb", formData.getAll("segment"));
      const file = formData.getAll("segment");
      const outputFileName = formData.get("segment").name;
      // console.log(file);
      // display(file[0], document.getElementById("v"));
      const link = document.createElement("a");
      console.log("fillll", file);
      link.href = window.URL.createObjectURL(file[0]);
      link.target = "_blank";
      // debugger;
      console.log("link:", link.href);
      link.download = outputFileName;
      link.click();
    }
  });

  //   return options;
};

function display(videoFile, videoEl) {
  // Preconditions:
  if (!(videoFile instanceof Blob))
    throw new Error("`videoFile` must be a Blob or File object."); // The `File` prototype extends the `Blob` prototype, so `instanceof Blob` works for both.
  if (!(videoEl instanceof HTMLVideoElement))
    throw new Error("`videoEl` must be a <video> element.");

  //

  const newObjectUrl = URL.createObjectURL(videoFile);

  // URLs created by `URL.createObjectURL` always use the `blob:` URI scheme: https://w3c.github.io/FileAPI/#dfn-createObjectURL
  const oldObjectUrl = videoEl.currentSrc;
  if (oldObjectUrl && oldObjectUrl.startsWith("blob:")) {
    // It is very important to revoke the previous ObjectURL to prevent memory leaks. Un-set the `src` first.
    // See https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL

    videoEl.src = ""; // <-- Un-set the src property *before* revoking the object URL.
    URL.revokeObjectURL(oldObjectUrl);
  }

  // Then set the new URL:
  videoEl.src = newObjectUrl;

  // And load it:
  videoEl.load(); // https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load
}

const init = async () => {
  const settings = {
    width: 1280,
    height: 720,
  };

  const videoInput = document.getElementById("inputVideo");
  const stream = await captureVideo(videoInput);
  const track = stream.getVideoTracks()[0];
  //  const imageCapture=new ImageCapture(track);
  //  imageCapture.
  const capabilties = track.getCapabilities();

  if (capabilties.width) {
    settings.width = Math.min(capabilties.width.max, settings.width);
  }
  if (capabilties.height) {
    settings.height = Math.min(capabilties.height.max, settings.height);
  }

  await track.applyConstraints({
    width: settings.width,
    height: settings.height,
  });

  startCapture(track, settings);
};

init();
