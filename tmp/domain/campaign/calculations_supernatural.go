package campaign

const (
	levelStepSupernatural = 100
)

func (sStats *SupernaturalStats) GetRequiredXP() uint {
	var requiredXP uint

	for i := range sStats.skills {
		g := sStats.skills[i].getGroup()
		requiredXP += getGroupRequiredXP(g, levelStepSupernatural, 1)
	}

	return requiredXP
}

func (skill Skill) getGroup() []uint {
	var sum uint

	for i := range skill.transformations {
		sum += skill.transformations[i]
	}

	return []uint{sum}
}

func (sStats *SupernaturalStats) getOrderedStats() []uint {
	groups := make([][]uint, len(sStats.skills))

	for i, skill := range sStats.skills {
		groups[i] = skill.transformations
	}

	return concatenateGroups(groups)
}

func (ss *SupernaturalStats) isHigherThan(ssB *SupernaturalStats) bool {
	stats := ss.getOrderedStats()
	statsB := ssB.getOrderedStats()

	return isHigherThan(stats, statsB)
}
