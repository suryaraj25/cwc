import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal, ModalProps } from "../ui/Modal";
import { api } from "../../services/api";
import { toast } from "../../stores/useToastStore";
import { Team } from "../../types";

interface TeamScore {
  id: string;
  teamId: string;
  score: number;
  date: string;
  enteredBy: string;
  notes: string;
}

interface TeamWithScore extends Team {
  score: number;
  notes: string;
}

export const AdminScoreManager: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [dailyScores, setDailyScores] = useState<
    Record<string, { score: number; notes: string; scoreId: string | null }>
  >({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>("");

  const [modalState, setModalState] = useState<ModalProps>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onClose: () => {},
  });

  const showModal = (
    title: string,
    message: React.ReactNode,
    type: ModalProps["type"] = "info",
    onConfirm?: () => void,
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      onClose: () => setModalState((prev) => ({ ...prev, isOpen: false })),
    });
  };

  // Load teams and daily scores
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teamsData, scoresData] = await Promise.all([
          api.getTeams(),
          api.getDailyLeaderboard(selectedDate),
        ]);

        setTeams(teamsData);

        // Convert leaderboard response to score map
        const scoreMap: Record<
          string,
          { score: number; notes: string; scoreId: string | null }
        > = {};
        scoresData.leaderboard?.forEach((team: any) => {
          scoreMap[team.id] = {
            score: team.score || 0,
            notes: team.notes || "",
            scoreId: team.scoreId || null,
          };
        });
        setDailyScores(scoreMap);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast.error("Failed to load teams or scores");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  const handleScoreChange = (
    teamId: string,
    score: number,
    scoreId: string | null = null,
  ) => {
    setDailyScores((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], score, scoreId },
    }));
  };

  const handleNotesChange = (teamId: string, notes: string) => {
    setDailyScores((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], notes },
    }));
  };

  const handleStartEdit = (teamId: string) => {
    const current = dailyScores[teamId] || {
      score: 0,
      notes: "",
      scoreId: null,
    };
    setEditingTeamId(teamId);
    setEditScore(current.score);
    setEditNotes(current.notes);
  };

  const handleSaveScore = async () => {
    if (!editingTeamId) return;

    setSaving(true);
    try {
      const result = await api.submitTeamScore(
        editingTeamId,
        editScore,
        selectedDate,
        editNotes,
      );

      if (result.success) {
        const scoreId = result.teamScore?._id || result.teamScore?.id || null;
        handleScoreChange(editingTeamId, editScore, scoreId);
        handleNotesChange(editingTeamId, editNotes);
        setEditingTeamId(null);
        toast.success("Score saved successfully!");
      } else {
        toast.error(result.message || "Failed to save score");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save score");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScore = (teamId: string) => {
    const scoreId = dailyScores[teamId]?.scoreId;

    if (!scoreId) {
      toast.error("No score to delete");
      return;
    }

    showModal(
      "Delete Score",
      `Are you sure you want to delete the score for this team?`,
      "confirm",
      async () => {
        setSaving(true);
        try {
          const result = await api.deleteTeamScore(scoreId);
          if (result.success) {
            handleScoreChange(teamId, 0, null);
            handleNotesChange(teamId, "");
            toast.success("Score deleted successfully!");
          } else {
            toast.error(result.message || "Failed to delete score");
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to delete score");
        } finally {
          setSaving(false);
        }
      },
    );
  };

  const saveAllScores = async () => {
    setSaving(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const team of teams) {
        const score = dailyScores[team.id];
        if (score && score.score > 0) {
          try {
            const result = await api.submitTeamScore(
              team.id,
              score.score,
              selectedDate,
              score.notes,
            );
            if (result.success) {
              successCount++;
              // Update local state with scoreId
              const scoreId =
                result.teamScore?._id || result.teamScore?.id || null;
              handleScoreChange(team.id, score.score, scoreId);
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Saved ${successCount} team scores!`);
        // Refresh data to ensure consistency
        const scoresData = await api.getDailyLeaderboard(selectedDate);
        const scoreMap: Record<
          string,
          { score: number; notes: string; scoreId: string | null }
        > = {};
        scoresData.leaderboard?.forEach((team: any) => {
          scoreMap[team.id] = {
            score: team.score || 0,
            notes: team.notes || "",
            scoreId: team.scoreId || null,
          };
        });
        setDailyScores(scoreMap);
      }
      if (failCount > 0) {
        toast.error(`Failed to save ${failCount} scores`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 p-8 text-center">
        <p className="text-slate-400">Loading teams...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Manage Team Scores
          </h2>
          <p className="text-sm text-slate-400">Enter daily marks for teams</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
          />
          {/* <Button
            onClick={saveAllScores}
            isLoading={saving}
            className="bg-green-600 hover:bg-green-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save All
          </Button> */}
        </div>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const score = dailyScores[team.id] || { score: 0, notes: "" };
          const isEditing = editingTeamId === team.id;

          return (
            <Card
              key={team.id}
              className="bg-slate-800 border-slate-700 overflow-hidden hover:border-indigo-500 transition"
            >
              {/* Team Image */}
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={team.imageUrl}
                  alt={team.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Team Info */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{team.name}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {team.description}
                  </p>
                </div>

                {/* Score Input */}
                {isEditing ? (
                  <div className="space-y-3 bg-slate-900/50 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Score
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editScore}
                        onChange={(e) =>
                          setEditScore(
                            Math.max(0, parseInt(e.target.value) || 0),
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full bg-slate-700 text-white px-3 py-2 rounded border border-slate-600 focus:border-indigo-500 outline-none text-sm resize-none"
                        rows={2}
                        placeholder="Add notes (optional)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveScore}
                        isLoading={saving}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-sm"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => setEditingTeamId(null)}
                        disabled={saving}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-end gap-2">
                      <div>
                        <p className="text-xs text-slate-400 uppercase">
                          Current Score
                        </p>
                        <p className="text-3xl font-bold text-indigo-400">
                          {score.score}
                        </p>
                      </div>
                      {score.notes && (
                        <p className="text-xs text-slate-500 flex-1 line-clamp-1">
                          Note: {score.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={() => handleStartEdit(team.id)}
                        disabled={saving}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-sm"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      {score.scoreId && (
                        <Button
                          onClick={() => handleDeleteScore(team.id)}
                          disabled={saving}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-sm"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal {...modalState} />
    </div>
  );
};
