import { useEffect, useState } from "react";
import {
	isBackgroundMusicPlaying,
	startBackgroundMusic,
	subscribeBackgroundMusic,
	toggleBackgroundMusic,
} from "../audio";

const backgroundSrc = `${import.meta.env.BASE_URL}images/background.jpg`;
const callumSrc = `${import.meta.env.BASE_URL}images/callum-1.png`;

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
	const [aboutOpen, setAboutOpen] = useState(false);

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

	useEffect(() => {
		if (!aboutOpen) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setAboutOpen(false);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [aboutOpen]);

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
				<h1>Callum&apos;s Cozy Relaxing <span className="landing-panel-title-sub">Augmented Reality</span> ASMR Fox Shooting Simulator</h1>
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

					<button
						type="button"
						className="button button--link"
						aria-haspopup="dialog"
						aria-expanded={aboutOpen}
						onClick={() => setAboutOpen(true)}
					>
						About
					</button>
				</div>
			</div>

			{aboutOpen ? (
				<div
					className="landing-about"
					role="presentation"
					onClick={() => setAboutOpen(false)}
				>
					<div
						className="landing-about-dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="landing-about-title"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="landing-about-header">
							<h2 id="landing-about-title">About</h2>
							<button
								type="button"
								className="landing-about-close"
								aria-label="Close about"
								onClick={() => setAboutOpen(false)}
							>
								×
							</button>
						</div>
						<p>
							Welcome to Callum&apos;s carefully peer-reviewed institute of
							woodland wellness, where every virtual fox is ethically sourced
							from a server farm that practices regenerative packet composting. Inspired by a Brandenburg art walk weekend at Takka.
						</p>
						<p>
							Our proprietary CalmBallistics™ engine converts muzzle velocity
							into mindfulness credits, which you can redeem for a slightly
							softer camera shake and the quiet satisfaction of having done
							something outdoors without going outdoors.
						</p>
						<p>
							Independent laboratory tests (conducted in a browser tab that was
							open too long) confirm a 400% increase in cozy per capita when
							users whisper &quot;nice shot&quot; after each hit. Side effects
							may include mild nostalgia for Windows XP screensavers, an urge
							to narrate your own breathing, and the unshakable belief that
							ASMR and marksmanship were always meant to share a product page.
							No foxes were harmed; several were politely asked to respawn.
						</p>
					</div>
				</div>
			) : null}
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
