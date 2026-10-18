import { useEffect, useState } from "react";
import {
	isBackgroundMusicPlaying,
	startBackgroundMusic,
	subscribeBackgroundMusic,
	toggleBackgroundMusic,
} from "../audio";

const backgroundSrc = `${import.meta.env.BASE_URL}images/background.jpg`;
const callumSrc = `${import.meta.env.BASE_URL}images/callum.png`;

type LandingScreenProps = {
	arCapable: boolean;
	onStartAr: () => void;
	onStartDemo: () => void;
};

export function LandingScreen({
	arCapable,
	onStartAr,
	onStartDemo,
}: LandingScreenProps) {
	const [musicPlaying, setMusicPlaying] = useState(isBackgroundMusicPlaying);

	useEffect(() => {
		startBackgroundMusic();
		setMusicPlaying(isBackgroundMusicPlaying());

		const unlock = () => {
			startBackgroundMusic();
		};

		// Browsers often block autoplay until the first tap/keypress.
		window.addEventListener("pointerdown", unlock, { once: true });
		window.addEventListener("keydown", unlock, { once: true });

		const unsubscribe = subscribeBackgroundMusic(() => {
			setMusicPlaying(isBackgroundMusicPlaying());
		});

		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
			unsubscribe();
		};
	}, []);

	return (
		<div
			className="landing"
			style={{ backgroundImage: `url(${backgroundSrc})` }}
		>
			<div className="landing-veil" aria-hidden="true" />

			<img
				className="landing-callum"
				src={callumSrc}
				alt=""
				aria-hidden="true"
				draggable={false}
			/>

			<button
				type="button"
				className="landing-sound"
				aria-label={musicPlaying ? "Pause sound" : "Resume sound"}
				aria-pressed={!musicPlaying}
				onClick={(event) => {
					event.stopPropagation();
					setMusicPlaying(toggleBackgroundMusic());
				}}
			>
				{musicPlaying ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
			</button>

			<div className="landing-panel">
				<h1>Callum&apos;s <span className="landing-panel-title-sub">Augmented Reality</span> Chill Relaxing ASMR Fox Shooting Simulator</h1>
				<p className="landing-description">
					{arCapable
						? "I'll be a dang gone monkey's uncle if I can't chill out and shoot some foxes."
						: "Try the 3D demo here, or open this page on a phone for AR."}
				</p>

				<div className="landing-actions">
					{arCapable ? (
						<button
							type="button"
							className="button button--start"
							onClick={onStartAr}
						>
							Start AR
						</button>
					) : null}

					<button
						type="button"
						className="button button--link"
						onClick={onStartDemo}
					>
						Try desktop demo
					</button>
				</div>
			</div>
		</div>
	);
}

function SpeakerOnIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
			/>
		</svg>
	);
}

function SpeakerOffIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"
			/>
		</svg>
	);
}
