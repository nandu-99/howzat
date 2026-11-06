import unittest
from backend.compiler.results import match_result

TEAMS = {"IND": "India", "AUS": "Australia"}
def card(team, runs, wickets=0, complete=False):
    return {"team": team, "name": TEAMS[team], "runs": runs, "wickets": wickets,
            "complete": complete, "overs_display": "2.0"}

class ResultTests(unittest.TestCase):
    def test_no_innings(self):
        self.assertEqual(match_result([], TEAMS)["status"], "in_progress")

    def test_unfinished_first_does_not_confirm_target(self):
        result = match_result([card("IND", 21), card("AUS", 25)], TEAMS)
        self.assertEqual(result["status"], "in_progress")
        self.assertIsNone(result["target"])

    def test_waiting_for_chase(self):
        result = match_result([card("IND", 21, complete=True)], TEAMS)
        self.assertEqual(result["status"], "awaiting_second_innings")
        self.assertEqual(result["target"], 22)

    def test_wicket_win(self):
        result = match_result([card("IND", 21, complete=True), card("AUS", 22, 3)], TEAMS)
        self.assertEqual((result["winner"], result["margin"], result["margin_type"]), ("AUS", 7, "wickets"))

    def test_runs_win(self):
        result = match_result([card("IND", 21, complete=True), card("AUS", 18, complete=True)], TEAMS)
        self.assertEqual((result["winner"], result["margin"]), ("IND", 3))

    def test_tie_requires_completion(self):
        first, second = card("IND", 21, complete=True), card("AUS", 21)
        self.assertEqual(match_result([first, second], TEAMS)["runs_needed"], 1)
        second["complete"] = True
        self.assertEqual(match_result([first, second], TEAMS)["status"], "tied")
