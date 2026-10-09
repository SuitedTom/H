import unittest

from sticknodes.qa.reference_motion import (
    analyze_landmark_tracks,
    measure_contact_drift,
    summarize_motion_events,
)


class TestReferenceMotionMeasurements(unittest.TestCase):
    def test_constant_velocity_uses_fps_units(self):
        frames = [{"pelvis": (0, 0)}, {"pelvis": (1, 0)}, {"pelvis": (2, 0)}]
        result = analyze_landmark_tracks(frames, fps=2)
        rows = result["landmarks"]["pelvis"]
        self.assertIsNone(rows[0]["vx"])
        self.assertAlmostEqual(rows[1]["vx"], 2.0)
        self.assertAlmostEqual(rows[2]["speed"], 2.0)

    def test_missing_landmark_is_not_silently_interpolated(self):
        frames = [{"foot": (0, 0)}, {}, {"foot": (2, 0)}]
        rows = analyze_landmark_tracks(frames, fps=24)["landmarks"]["foot"]
        self.assertIsNone(rows[1]["vx"])
        self.assertIsNone(rows[2]["vx"])

    def test_contact_drift_reports_world_space_error(self):
        frames = [{"foot": (10, 20)}, {"foot": (11, 20)}, {"foot": (13, 24)}]
        result = measure_contact_drift(frames, "foot", 0, 2)
        self.assertEqual(result["status"], "measured")
        self.assertAlmostEqual(result["net_drift"], 5.0)
        self.assertAlmostEqual(result["max_drift_from_contact_start"], 5.0)

    def test_contact_drift_missing_data_is_inconclusive(self):
        result = measure_contact_drift([{"foot": (0, 0)}, {}], "foot", 0, 1)
        self.assertEqual(result["status"], "inconclusive_missing_landmark")
        self.assertEqual(result["missing_frames"], [1])

    def test_event_windows_are_bounds_checked_and_overlaps_reported(self):
        result = summarize_motion_events([
            {"name": "anticipation", "start_frame": 1, "end_frame": 3},
            {"name": "impact", "start_frame": 3, "end_frame": 4},
            {"name": "bad", "start_frame": 7, "end_frame": 8},
        ], frame_count=6)
        self.assertEqual(result["event_count"], 2)
        self.assertTrue(any(i["issue"] == "overlaps_previous_event" for i in result["issues"]))
        self.assertTrue(any(i["issue"] == "frame_window_out_of_range" for i in result["issues"]))

    def test_invalid_fps_is_rejected(self):
        with self.assertRaises(ValueError):
            analyze_landmark_tracks([{"head": (0, 0)}], fps=0)


if __name__ == "__main__":
    unittest.main()
