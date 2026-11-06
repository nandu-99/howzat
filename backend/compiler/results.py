def match_result(scorecards, teams):
    """Results for two teams with one innings each; completion is explicit."""
    result = {
        "status": "in_progress", "winner": None, "winner_name": None,
        "margin": None, "margin_type": None, "target": None, "runs_needed": None,
        "message": "Match in progress", "detail": "The first innings is still in progress.",
    }
    if not scorecards:
        result["detail"] = "No innings have been scored yet."
        return result
    first = scorecards[0]
    if not first["complete"]:
        result["detail"] = f"{first['name']}'s innings is still in progress. Mark it complete to confirm the target."
        return result

    target = first["runs"] + 1
    result["target"] = target
    if len(scorecards) == 1:
        opponent = next(name for team, name in teams.items() if team != first["team"])
        result.update(status="awaiting_second_innings", message="Awaiting the second innings",
                      detail=f"{opponent} need {target} {'run' if target == 1 else 'runs'} to win.", runs_needed=target)
        return result

    second = scorecards[1]
    if second["runs"] >= target:
        margin = 10 - second["wickets"]
        result.update(status="won", winner=second["team"], winner_name=second["name"],
                      margin=margin, margin_type="wickets", runs_needed=0,
                      message=f"{second['name']} won by {margin} {'wicket' if margin == 1 else 'wickets'}",
                      detail=f"Target {target} reached at {second['runs']}/{second['wickets']} in {second['overs_display']} overs.")
    elif not second["complete"]:
        needed = target - second["runs"]
        result.update(runs_needed=needed,
                      detail=f"{second['name']} need {needed} more {'run' if needed == 1 else 'runs'} to win. Target: {target}.")
    elif second["runs"] == first["runs"]:
        result.update(status="tied", message="Match tied", runs_needed=0,
                      detail=f"Both teams finished on {first['runs']} runs.")
    else:
        margin = first["runs"] - second["runs"]
        result.update(status="won", winner=first["team"], winner_name=first["name"],
                      margin=margin, margin_type="runs", runs_needed=0,
                      message=f"{first['name']} won by {margin} {'run' if margin == 1 else 'runs'}",
                      detail=f"{first['runs']}/{first['wickets']} against {second['runs']}/{second['wickets']}. Both innings are complete.")
    return result
