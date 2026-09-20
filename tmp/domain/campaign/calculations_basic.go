package campaign

const (
	levelStepBasic = 10
	costLife       = 5
)

func (bs *BasicStats) GetRequiredXP() uint {
	physicalGroup := bs.physical.getGroup()
	mentalGroup := bs.mental.getGroup()
	coordGroup := bs.coordination.getGroup()

	physicalXP := getGroupRequiredXP(physicalGroup, levelStepBasic, getFirstLevelCost(bs.physical.isTalented))
	mentalXP := getGroupRequiredXP(mentalGroup, levelStepBasic, getFirstLevelCost(bs.mental.isTalented))
	coordXP := getGroupRequiredXP(coordGroup, levelStepBasic, getFirstLevelCost(bs.coordination.isTalented))

	lifeXP := costLife * bs.life

	return physicalXP + mentalXP + coordXP + lifeXP
}

func (p Physical) getGroup() []uint {
	return []uint{p.strength, p.agility, p.speed, p.resistance}
}

func (m Mental) getGroup() []uint {
	return []uint{m.inteligence, m.wisdom, m.concentration, m.will}
}

func (c Coordination) getGroup() []uint {
	return []uint{c.precision, c.calculation, c.coordRange, c.reflexes}
}

func getFirstLevelCost(isTalented bool) uint {
	if isTalented {
		return 1
	}
	return 3
}

func (bs BasicStats) isHigherThan(bsB BasicStats) bool {
	stats := bs.getOrderedStats()
	statsB := bsB.getOrderedStats()

	return isHigherThan(stats, statsB)
}

func (bs BasicStats) getOrderedStats() []uint {
	groups := [][]uint{
		bs.physical.getGroup(),
		bs.mental.getGroup(),
		bs.coordination.getGroup(),
		{bs.life},
	}

	return concatenateGroups(groups)
}
