import classNames from "classnames";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactEventHandler } from "react";

import { AspectRatioBox } from "@web-speed-hackathon-2026/client/src/components/foundation/AspectRatioBox";
import { FontAwesomeIcon } from "@web-speed-hackathon-2026/client/src/components/foundation/FontAwesomeIcon";

interface Props {
  src: string;
}

/**
 * クリックすると再生・一時停止を切り替えます。
 */
export const PausableMovie = ({ src }: Props) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const pausedCanvasRef = useRef<HTMLCanvasElement>(null);

  const shouldReduceMotion = useMemo(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const captureFrame = useCallback(() => {
    const image = imageRef.current;
    const canvas = pausedCanvasRef.current;
    if (
      image === null ||
      canvas === null ||
      image.naturalWidth === 0 ||
      image.naturalHeight === 0
    ) {
      return;
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }, []);

  const handleLoad = useCallback<ReactEventHandler<HTMLImageElement>>(() => {
    setIsLoaded(true);
    if (shouldReduceMotion) {
      captureFrame();
      setIsPlaying(false);
    }
  }, [captureFrame, shouldReduceMotion]);

  const handleClick = useCallback(() => {
    setIsPlaying((isPlaying) => {
      if (isPlaying) {
        captureFrame();
      } else {
        imageRef.current?.decode().catch(() => {});
      }
      return !isPlaying;
    });
  }, [captureFrame]);

  return (
    <AspectRatioBox aspectHeight={1} aspectWidth={1}>
      <div className="h-full w-full">
        <button
          aria-label="動画プレイヤー"
          className="group relative block h-full w-full"
          onClick={handleClick}
          type="button"
        >
          {!isLoaded ? <div className="bg-cax-surface-subtle h-full w-full" /> : null}
          <img
            ref={imageRef}
            alt=""
            className={classNames("h-full w-full object-cover", {
              hidden: !isPlaying,
            })}
            decoding="async"
            loading="lazy"
            onLoad={handleLoad}
            src={src}
          />
          <canvas
            ref={pausedCanvasRef}
            className={classNames("absolute inset-0 h-full w-full object-cover", {
              hidden: isPlaying,
            })}
          />
          <div
            className={classNames(
              "absolute left-1/2 top-1/2 flex items-center justify-center w-16 h-16 text-cax-surface-raised text-3xl bg-cax-overlay/50 rounded-full -translate-x-1/2 -translate-y-1/2",
              {
                "opacity-0 group-hover:opacity-100": isPlaying,
              },
            )}
          >
            <FontAwesomeIcon iconType={isPlaying ? "pause" : "play"} styleType="solid" />
          </div>
        </button>
      </div>
    </AspectRatioBox>
  );
};
