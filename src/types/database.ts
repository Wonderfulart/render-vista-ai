// VeoStudio Pro Database Types

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  credits: number;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  total_videos_created: number;
  high_contrast_mode: boolean;
  text_size_percent: number;
  reduced_motion: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  master_character_url: string | null;
  master_audio_url: string | null;
  audio_duration_seconds: number | null;
  shot_template_id: string | null;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  total_cost: number;
  final_video_url: string | null;
  scenes_completed: number;
  created_at: string;
  updated_at: string;
}

export interface VideoScene {
  id: string;
  project_id: string;
  user_id: string;
  scene_index: number;
  script_text: string | null;
  camera_movement: string;
  camera_tier: 'basic' | 'advanced' | 'cinematic' | 'combo';
  audio_clip_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  generation_cost: number;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  ai_suggestions: string[];
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: 'purchase' | 'generation' | 'refund' | 'bonus' | 'ai_script' | 'thumbnail';
  description: string | null;
  reference_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface GenerationQueue {
  id: string;
  scene_id: string;
  user_id: string;
  project_id: string;
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  webhook_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShotTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  movements: CameraMovementConfig[];
  is_default: boolean;
  created_at: string;
}

export interface CameraMovementConfig {
  index: number;
  movement: string;
  tier: 'basic' | 'advanced' | 'cinematic' | 'combo';
}

// Camera movement definitions
export const CAMERA_MOVEMENTS = {
  basic: [
    { id: 'static', name: 'Static', description: 'No camera movement' },
    { id: 'zoom_in', name: 'Zoom In', description: 'Gradual zoom towards subject' },
    { id: 'zoom_out', name: 'Zoom Out', description: 'Gradual zoom away from subject' },
    { id: 'pan_left', name: 'Pan Left', description: 'Horizontal rotation left' },
    { id: 'pan_right', name: 'Pan Right', description: 'Horizontal rotation right' },
    { id: 'tilt_up', name: 'Tilt Up', description: 'Vertical rotation upward' },
    { id: 'tilt_down', name: 'Tilt Down', description: 'Vertical rotation downward' },
  ],
  advanced: [
    { id: 'dolly_in', name: 'Dolly In', description: 'Camera moves toward subject' },
    { id: 'dolly_out', name: 'Dolly Out', description: 'Camera moves away from subject' },
    { id: 'truck_left', name: 'Truck Left', description: 'Camera slides left' },
    { id: 'truck_right', name: 'Truck Right', description: 'Camera slides right' },
    { id: 'pedestal_up', name: 'Pedestal Up', description: 'Camera rises vertically' },
    { id: 'pedestal_down', name: 'Pedestal Down', description: 'Camera lowers vertically' },
    { id: 'crane_up', name: 'Crane Up', description: 'Sweeping upward arc' },
    { id: 'crane_down', name: 'Crane Down', description: 'Sweeping downward arc' },
    { id: 'orbit_cw', name: 'Orbit CW', description: 'Circle subject clockwise' },
    { id: 'orbit_ccw', name: 'Orbit CCW', description: 'Circle subject counter-clockwise' },
  ],
  cinematic: [
    { id: 'push_in', name: 'Push In', description: 'Dramatic forward movement' },
    { id: 'pull_out', name: 'Pull Out', description: 'Dramatic backward reveal' },
    { id: 'dutch_angle', name: 'Dutch Angle', description: 'Tilted horizon for tension' },
    { id: 'whip_pan', name: 'Whip Pan', description: 'Fast horizontal blur' },
    { id: 'tracking', name: 'Tracking', description: 'Follow subject movement' },
    { id: 'aerial_view', name: 'Aerial View', description: 'High overhead perspective' },
    { id: 'low_angle', name: 'Low Angle', description: 'Looking up at subject' },
    { id: 'high_angle', name: 'High Angle', description: 'Looking down at subject' },
    { id: 'over_the_shoulder', name: 'Over the Shoulder', description: 'POV from behind character' },
    { id: 'pov', name: 'POV', description: 'First-person perspective' },
    { id: 'steadicam_follow', name: 'Steadicam Follow', description: 'Smooth following shot' },
    { id: 'handheld', name: 'Handheld', description: 'Organic realistic shake' },
    { id: 'rack_focus', name: 'Rack Focus', description: 'Focus shift effect' },
    { id: 'parallax', name: 'Parallax', description: 'Layered depth movement' },
  ],
  combo: [
    { id: 'dolly_zoom', name: 'Dolly Zoom (Vertigo)', description: 'Dolly + Zoom for disorienting effect' },
    { id: 'orbit_tilt', name: 'Orbit + Tilt', description: 'Circular motion with vertical adjustment' },
    { id: 'crane_pan', name: 'Crane + Pan', description: 'Rising arc with horizontal rotation' },
  ],
} as const;

export type CameraTier = keyof typeof CAMERA_MOVEMENTS;
export type CameraMovement = {
  id: string;
  name: string;
  description: string;
  tier: CameraTier;
};

// Helper to get all movements as a flat array
export const getAllCameraMovements = (): CameraMovement[] => {
  return (Object.entries(CAMERA_MOVEMENTS) as [CameraTier, readonly { id: string; name: string; description: string }[]][])
    .flatMap(([tier, movements]) => 
      movements.map(m => ({ ...m, tier }))
    );
};

// Helper to get movements grouped by tier
export const getCameraMovementsByTier = (): Record<CameraTier, CameraMovement[]> => {
  return (Object.entries(CAMERA_MOVEMENTS) as [CameraTier, readonly { id: string; name: string; description: string }[]][])
    .reduce((acc, [tier, movements]) => {
      acc[tier] = movements.map(m => ({ ...m, tier }));
      return acc;
    }, {} as Record<CameraTier, CameraMovement[]>);
};
