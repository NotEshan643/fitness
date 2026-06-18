# JARVIS — Settings reference

JARVIS is configured by `config/settings.yaml` (created from
`config/settings.example.yaml`). Secrets go in `.env`, never in YAML.
All values are validated by pydantic models in `jarvis/core/config.py`.

## Identity
| Key | Default | Meaning |
|-----|---------|---------|
| `assistant.name` | `JARVIS` | Assistant name |
| `assistant.address_user_as` | `Sir` | How JARVIS addresses you |
| `assistant.greeting_style` | `classic` | `classic` \| `brief` \| `playful` |
| `assistant.personality` | `witty` | Tone bias for the persona |

## Wake word
| `wake.enabled` | `true` | Run background wake-word listener |
| `wake.phrase` | `wake up jarvis` | Trigger phrase (custom phrases supported) |
| `wake.sensitivity` | `0.6` | 0–1 detection threshold |

## Startup ritual
| `startup.sound` | `true` | Play startup chime on wake |
| `startup.play_highway_to_hell` | `false` | Play AC/DC on Spotify at wake |
| `startup.greet` | `true` | Speak a time-aware greeting |

## Voice
| `voice.tts_provider` | `elevenlabs` | `elevenlabs` \| `sapi` |
| `voice.stt_provider` | `deepgram` | `deepgram` \| `whisper` |
| `voice.voice_id` | `(British voice)` | Provider voice id |
| `voice.speed` | `1.0` | Speaking rate |
| `voice.pitch` | `1.0` | Pitch multiplier |
| `voice.interruptible` | `true` | Barge-in: stop speaking when you talk |

## Brain
| `brain.model` | `claude-opus-4-8` | Claude model id |
| `brain.max_tool_steps` | `12` | Agent loop step cap |
| `brain.temperature` | `0.7` | Sampling temperature |
| `brain.history_turns` | `20` | Recent turns injected as context |

## Memory
| `memory.autoextract` | `true` | Auto-save durable facts from chats (Phase 5) |
| `memory.max_recall` | `8` | Memories injected per turn |

## Permissions
| `permissions.confirm_destructive` | `true` | Confirm file deletes/moves etc. |
| `permissions.confirm_sensitive` | `true` | Confirm shutdown/scripts/purchases |
| `permissions.allow_shutdown` | `true` | Permit power tools at all |

## UI
| `ui.theme` | `ironman` | HUD theme |
| `ui.start_minimized` | `true` | Start in tray |
| `ui.hotkey_toggle` | `ctrl+alt+j` | Show/hide HUD |

## Secrets (`.env`)
`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `DEEPGRAM_API_KEY`,
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `TAVILY_API_KEY`.
