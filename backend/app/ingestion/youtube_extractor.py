import re
from typing import List, Dict, Any, Tuple, Optional
from youtube_transcript_api import YouTubeTranscriptApi
from backend.app.core.logging import logger


class YouTubeExtractor:
    """
    Extracts timestamped transcript segments from YouTube videos.
    Safely captures network timeouts, disabled transcripts, or invalid URLs
    without crashing the backend.
    """

    @classmethod
    def extract_video_id(cls, url: str) -> Optional[str]:
        """Extracts 11-character video ID from diverse YouTube URL patterns."""
        patterns = [
            r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
            r"(?:embed\/|v\/|youtu.be\/)([0-9A-Za-z_-]{11})",
            r"^([0-9A-Za-z_-]{11})$",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @classmethod
    def extract_transcript(cls, url: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieves transcript segments from YouTube video.
        Returns: (video_title, elements)
        Each element: {'text': str, 'page_number': None, 'timestamp_seconds': float, 'section': str}
        """
        video_id = cls.extract_video_id(url)
        if not video_id:
            raise ValueError(f"Invalid YouTube URL or ID: '{url}'. Please provide a valid YouTube video link.")

        video_title = f"YouTube Video ({video_id})"

        try:
            # Fetch transcript list
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            elements: List[Dict[str, Any]] = []

            # Group transcript snippets into ~30-60 second structural blocks
            current_block_text = ""
            current_start_ts = 0.0

            for entry in transcript_list:
                text_part = entry.get("text", "").strip()
                start_ts = entry.get("start", 0.0)

                if not current_block_text:
                    current_start_ts = start_ts

                current_block_text += " " + text_part

                # Group into paragraphs roughly every 250 characters
                if len(current_block_text) >= 250:
                    minutes = int(current_start_ts // 60)
                    seconds = int(current_start_ts % 60)
                    time_label = f"Timestamp {minutes:02d}:{seconds:02d}"

                    elements.append({
                        "text": current_block_text.strip(),
                        "page_number": None,
                        "timestamp_seconds": round(current_start_ts, 1),
                        "section": time_label,
                    })
                    current_block_text = ""

            if current_block_text:
                minutes = int(current_start_ts // 60)
                seconds = int(current_start_ts % 60)
                elements.append({
                    "text": current_block_text.strip(),
                    "page_number": None,
                    "timestamp_seconds": round(current_start_ts, 1),
                    "section": f"Timestamp {minutes:02d}:{seconds:02d}",
                })

            return video_title, elements

        except Exception as e:
            err_msg = str(e)
            logger.warning(f"YouTube transcript extraction failed for video {video_id}: {err_msg}")
            if "TranscriptsDisabled" in err_msg or "Subtitles are disabled" in err_msg:
                raise ValueError("Transcripts are disabled or unavailable for this YouTube video.")
            elif "NoTranscriptFound" in err_msg:
                raise ValueError("No English transcript found for this video.")
            elif "Could not resolve" in err_msg or "Failed to establish a new connection" in err_msg:
                raise ValueError("Network error: Unable to contact YouTube. Running in offline mode.")
            else:
                raise ValueError(f"Could not extract YouTube transcript: {err_msg}")
