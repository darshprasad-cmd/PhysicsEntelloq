import cvReady from "@techstark/opencv-js";
import type * as OpenCV from "@techstark/opencv-js";
import { patchRect } from "../lib/tracking";

type CV = typeof OpenCV;
type Mat = OpenCV.Mat;
interface Request {
  id: number;
  type: "init" | "frame";
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  x?: number;
  y?: number;
  radius?: number;
}
let cv: CV;
let template: Mat | undefined;
let last = { x: 0, y: 0 };
let velocity = { x: 0, y: 0 };
let anchor = { x: 0, y: 0 };

const ready = Promise.resolve(cvReady).then((value) => {
  cv = value as unknown as CV;
});

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  let rgba: Mat | undefined;
  let gray: Mat | undefined;
  let roi: Mat | undefined;
  let result: Mat | undefined;
  try {
    await ready;
    rgba = cv.matFromImageData(
      new ImageData(
        request.pixels as Uint8ClampedArray<ArrayBuffer>,
        request.width,
        request.height,
      ),
    );
    gray = new cv.Mat();
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    if (request.type === "init") {
      template?.delete();
      template = undefined;
      const box = patchRect(
        {
          x: request.x ?? request.width / 2,
          y: request.y ?? request.height / 2,
        },
        request.radius ?? 18,
        request.width,
        request.height,
      );
      roi = gray.roi(new cv.Rect(box.x, box.y, box.width, box.height));
      // copyTo creates a contiguous owned matrix; embind's clone can alias a strided ROI.
      template = new cv.Mat();
      roi.copyTo(template);
      let sum = 0;
      let sumSquares = 0;
      for (const value of template.data) {
        sum += value;
        sumSquares += value * value;
      }
      const variance =
        sumSquares / template.data.length - (sum / template.data.length) ** 2;
      if (variance < 15) {
        template.delete();
        template = undefined;
        throw new Error(
          "This patch is too uniform to track. Select an object edge with some contrasting background, or use manual marks.",
        );
      }
      anchor = {
        x: (request.x ?? box.x + box.width / 2) - box.x,
        y: (request.y ?? box.y + box.height / 2) - box.y,
      };
      last = { x: box.x + anchor.x, y: box.y + anchor.y };
      velocity = { x: 0, y: 0 };
      self.postMessage({ id: request.id, x: last.x, y: last.y, confidence: 1 });
      return;
    }
    if (!template) throw new Error("Choose an object before tracking.");
    const radius = Math.max(
      60,
      template.cols * 2,
      Math.hypot(velocity.x, velocity.y) * 2.5,
    );
    const center = { x: last.x + velocity.x, y: last.y + velocity.y };
    const left = Math.max(0, Math.floor(center.x - radius - template.cols / 2));
    const top = Math.max(0, Math.floor(center.y - radius - template.rows / 2));
    const right = Math.min(
      request.width,
      Math.ceil(center.x + radius + template.cols / 2),
    );
    const bottom = Math.min(
      request.height,
      Math.ceil(center.y + radius + template.rows / 2),
    );
    if (right - left < template.cols || bottom - top < template.rows)
      throw new Error("The tracked object left the picture.");
    roi = gray.roi(new cv.Rect(left, top, right - left, bottom - top));
    result = new cv.Mat();
    cv.matchTemplate(roi, template, result, cv.TM_CCOEFF_NORMED);
    // OpenCV.js accepts one argument; the package declaration incorrectly requires a second.
    const match = (cv.minMaxLoc as (matrix: Mat) => OpenCV.MinMaxLoc)(result);
    const confidence = Number.isFinite(match.maxVal)
      ? Math.max(0, Math.min(1, match.maxVal))
      : 0;
    const current = {
      x: left + match.maxLoc.x + anchor.x,
      y: top + match.maxLoc.y + anchor.y,
    };
    if (confidence >= 0.6) {
      velocity = { x: current.x - last.x, y: current.y - last.y };
      last = current;
    }
    self.postMessage({ id: request.id, ...current, confidence });
  } catch (error) {
    self.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    result?.delete();
    roi?.delete();
    gray?.delete();
    rgba?.delete();
  }
};
