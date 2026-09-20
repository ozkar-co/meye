package campaign

func getStatRequiredXP(stat, levelStep, firstLevelCost uint) uint {
	completeLevels := stat / levelStep
	lastLevelPoints := stat % levelStep

	delta := (firstLevelCost * (firstLevelCost - 1) / 2) * levelStep
	n := completeLevels + firstLevelCost - 1

	completeLevelsRequiredXP := ((n * (n + 1) / 2) * levelStep) - delta
	lastLevelPointsRequiredXP := (completeLevels + firstLevelCost) * lastLevelPoints

	return completeLevelsRequiredXP + lastLevelPointsRequiredXP
}

func getGroupRequiredXP(group []uint, levelStep, firstLevelCost uint) uint {
	var requiredXP uint
	for i := range group {
		requiredXP += getStatRequiredXP(group[i], levelStep, firstLevelCost)
	}

	return requiredXP
}

func isHigherThan(a, b []uint) bool {
	for i := range a {
		if a[i] > b[i] {
			return true
		}
	}

	return false
}

func concatenateGroups(groups [][]uint) []uint {
	var totalLen int

	for _, s := range groups {
		totalLen += len(s)
	}

	stats := make([]uint, totalLen)

	var i int

	for _, s := range groups {
		i += copy(stats[i:], s)
	}

	return stats
}
