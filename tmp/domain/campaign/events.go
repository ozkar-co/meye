package campaign

import (
	"meye-core/internal/domain/event"
	"time"

	"github.com/google/uuid"
)

var _ event.DomainEvent = (*CampaignCreatedEvent)(nil)

type CampaignCreatedEvent struct {
	id         string
	campaignID string
	createdAt  time.Time
	occurredAt time.Time
}

func (e CampaignCreatedEvent) ID() string                         { return e.id }
func (e CampaignCreatedEvent) Type() event.EventType              { return event.EventTypeCampaignCreated }
func (e CampaignCreatedEvent) AggregateID() string                { return e.campaignID }
func (e CampaignCreatedEvent) AggregateType() event.AggregateType { return event.AggregateTypeCampaign }
func (e CampaignCreatedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e CampaignCreatedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e CampaignCreatedEvent) GetSerializedData() map[string]interface{} {
	return map[string]interface{}{}
}

func newCampaignCreatedEvent(c *Campaign) CampaignCreatedEvent {
	return CampaignCreatedEvent{
		id:         uuid.NewString(),
		campaignID: c.id,
		createdAt:  time.Now(),
		occurredAt: time.Now(),
	}
}

var _ event.DomainEvent = (*UserInvitedEvent)(nil)

type UserInvitedEvent struct {
	id         string
	campaignID string
	userID     string
	createdAt  time.Time
	occurredAt time.Time
}

func (e UserInvitedEvent) ID() string                         { return e.id }
func (e UserInvitedEvent) Type() event.EventType              { return event.EventTypeUserInvited }
func (e UserInvitedEvent) AggregateID() string                { return e.userID }
func (e UserInvitedEvent) AggregateType() event.AggregateType { return event.AggregateTypeUser }
func (e UserInvitedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e UserInvitedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e UserInvitedEvent) CampaignID() string { return e.campaignID }

func (e UserInvitedEvent) GetSerializedData() map[string]interface{} {
	return map[string]interface{}{
		"campaign_id": e.campaignID,
	}
}

func newUserInvitedEvent(userID, campaignID string) UserInvitedEvent {
	return UserInvitedEvent{
		id:         uuid.NewString(),
		campaignID: campaignID,
		userID:     userID,
		createdAt:  time.Now(),
		occurredAt: time.Now(),
	}
}

var _ event.DomainEvent = (*PjAddedEvent)(nil)

type PjAddedEvent struct {
	id         string
	campaignID string
	pjID       string
	createdAt  time.Time
	occurredAt time.Time
}

func (e PjAddedEvent) ID() string                         { return e.id }
func (e PjAddedEvent) Type() event.EventType              { return event.EventTypePjAdded }
func (e PjAddedEvent) AggregateID() string                { return e.pjID }
func (e PjAddedEvent) AggregateType() event.AggregateType { return event.AggregateTypePJ }
func (e PjAddedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e PjAddedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e PjAddedEvent) CampaignID() string { return e.campaignID }

func (e PjAddedEvent) GetSerializedData() map[string]interface{} {
	return map[string]interface{}{
		"campaign_id": e.campaignID,
	}
}

func newPjAddedEvent(pjID, campaignID string) PjAddedEvent {
	return PjAddedEvent{
		id:         uuid.NewString(),
		campaignID: campaignID,
		pjID:       pjID,
		createdAt:  time.Now(),
		occurredAt: time.Now(),
	}
}

var _ event.DomainEvent = (*XpConsumedEvent)(nil)

type XpConsumedEvent struct {
	id           string
	pjID         string
	basic        uint
	special      uint
	supernatural uint
	createdAt    time.Time
	occurredAt   time.Time
}

func (e XpConsumedEvent) ID() string                         { return e.id }
func (e XpConsumedEvent) Type() event.EventType              { return event.EventTypeXpConsumed }
func (e XpConsumedEvent) AggregateID() string                { return e.pjID }
func (e XpConsumedEvent) AggregateType() event.AggregateType { return event.AggregateTypePJ }
func (e XpConsumedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e XpConsumedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e XpConsumedEvent) Basic() uint        { return e.basic }
func (e XpConsumedEvent) Special() uint      { return e.special }
func (e XpConsumedEvent) SuperNatural() uint { return e.supernatural }

func (e XpConsumedEvent) GetSerializedData() map[string]interface{} {
	return map[string]interface{}{
		"basic":        e.basic,
		"special":      e.special,
		"supernatural": e.supernatural,
	}
}

func newXpConsumendEvent(pj *PJ, basic, special, supernatural uint) XpConsumedEvent {
	return XpConsumedEvent{
		id:           uuid.NewString(),
		pjID:         pj.id,
		basic:        basic,
		special:      special,
		supernatural: supernatural,
		createdAt:    time.Now(),
		occurredAt:   time.Now(),
	}
}

var _ event.DomainEvent = (*StatsUpdatedEvent)(nil)

type StatsUpdatedEvent struct {
	id                  string
	pjID                string
	basicSpentXp        uint
	specialSpentXp      uint
	supernaturalSpentXp uint
	// Previous stats
	previousBasicStats        BasicStats
	previousSpecialStats      SpecialStats
	previousSupernaturalStats *SupernaturalStats
	// New stats
	newBasicStats        BasicStats
	newSpecialStats      SpecialStats
	newSupernaturalStats *SupernaturalStats
	createdAt            time.Time
	occurredAt           time.Time
}

func (e StatsUpdatedEvent) ID() string                         { return e.id }
func (e StatsUpdatedEvent) Type() event.EventType              { return event.EventTypeStatsUpdated }
func (e StatsUpdatedEvent) AggregateID() string                { return e.pjID }
func (e StatsUpdatedEvent) AggregateType() event.AggregateType { return event.AggregateTypePJ }
func (e StatsUpdatedEvent) CreatedAt() time.Time               { return e.createdAt }
func (e StatsUpdatedEvent) OccurredAt() time.Time              { return e.occurredAt }

func (e StatsUpdatedEvent) BasicSpentXp() uint        { return e.basicSpentXp }
func (e StatsUpdatedEvent) SpecialSpentXp() uint      { return e.specialSpentXp }
func (e StatsUpdatedEvent) SupernaturalSpentXp() uint { return e.supernaturalSpentXp }

// Previous stats getters
func (e StatsUpdatedEvent) PreviousBasicStats() BasicStats     { return e.previousBasicStats }
func (e StatsUpdatedEvent) PreviousSpecialStats() SpecialStats { return e.previousSpecialStats }
func (e StatsUpdatedEvent) PreviousSupernaturalStats() *SupernaturalStats {
	return e.previousSupernaturalStats
}

// New stats getters
func (e StatsUpdatedEvent) NewBasicStats() BasicStats                { return e.newBasicStats }
func (e StatsUpdatedEvent) NewSpecialStats() SpecialStats            { return e.newSpecialStats }
func (e StatsUpdatedEvent) NewSupernaturalStats() *SupernaturalStats { return e.newSupernaturalStats }

func (e StatsUpdatedEvent) GetSerializedData() map[string]interface{} {
	data := map[string]interface{}{
		"basic_spent_xp":         e.basicSpentXp,
		"special_spent_xp":       e.specialSpentXp,
		"supernatural_spent_xp":  e.supernaturalSpentXp,
		"previous_basic_stats":   e.serializeBasicStats(e.previousBasicStats),
		"previous_special_stats": e.serializeSpecialStats(e.previousSpecialStats),
		"new_basic_stats":        e.serializeBasicStats(e.newBasicStats),
		"new_special_stats":      e.serializeSpecialStats(e.newSpecialStats),
	}

	if e.previousSupernaturalStats != nil {
		data["previous_supernatural_stats"] = e.serializeSupernaturalStats(e.previousSupernaturalStats)
	}

	if e.newSupernaturalStats != nil {
		data["new_supernatural_stats"] = e.serializeSupernaturalStats(e.newSupernaturalStats)
	}

	return data
}

// Private serialization methods

func (e StatsUpdatedEvent) serializeBasicStats(bs BasicStats) map[string]interface{} {
	return map[string]interface{}{
		"physical": map[string]interface{}{
			"strength":    bs.Physical().Strength(),
			"agility":     bs.Physical().Agility(),
			"speed":       bs.Physical().Speed(),
			"resistance":  bs.Physical().Resistance(),
			"is_talented": bs.Physical().IsTalented(),
		},
		"mental": map[string]interface{}{
			"inteligence":   bs.Mental().Inteligence(),
			"wisdom":        bs.Mental().Wisdom(),
			"concentration": bs.Mental().Concentration(),
			"will":          bs.Mental().Will(),
			"is_talented":   bs.Mental().IsTalented(),
		},
		"coordination": map[string]interface{}{
			"precision":   bs.Coordination().Precision(),
			"calculation": bs.Coordination().Calculation(),
			"range":       bs.Coordination().Range(),
			"reflexes":    bs.Coordination().Reflexes(),
			"is_talented": bs.Coordination().IsTalented(),
		},
		"life": bs.Life(),
	}
}

func (e StatsUpdatedEvent) serializeSpecialStats(ss SpecialStats) map[string]interface{} {
	return map[string]interface{}{
		"physical": map[string]interface{}{
			"empowerment":   ss.Physical().Empowerment(),
			"vital_control": ss.Physical().VitalControl(),
			"is_talented":   ss.Physical().IsTalented(),
		},
		"mental": map[string]interface{}{
			"ilusion":        ss.Mental().Ilusion(),
			"mental_control": ss.Mental().MentalControl(),
			"is_talented":    ss.Mental().IsTalented(),
		},
		"energy": map[string]interface{}{
			"object_handling": ss.Energy().ObjectHandling(),
			"energy_handling": ss.Energy().EnergyHandling(),
			"is_talented":     ss.Energy().IsTalented(),
		},
		"energy_tank":        ss.EnergyTank(),
		"is_energy_talented": ss.IsEnergyTalented(),
	}
}

func (e StatsUpdatedEvent) serializeSupernaturalStats(ss *SupernaturalStats) map[string]interface{} {
	skills := make([]map[string]interface{}, len(ss.Skills()))
	for i, skill := range ss.Skills() {
		skills[i] = map[string]interface{}{
			"transformations": skill.Transformations(),
		}
	}
	return map[string]interface{}{
		"skills": skills,
	}
}

func newStatsUpdatedEvent(
	pj *PJ,
	basicSpentXP uint,
	specialSpentXP uint,
	supernaturalSpentXP uint,
	previousBasicStats BasicStats,
	previousSpecialStats SpecialStats,
	previousSupernaturalStats *SupernaturalStats,
	newBasicStats BasicStats,
	newSpecialStats SpecialStats,
	newSupernaturalStats *SupernaturalStats,
) StatsUpdatedEvent {
	return StatsUpdatedEvent{
		id:                        uuid.NewString(),
		pjID:                      pj.id,
		basicSpentXp:              basicSpentXP,
		specialSpentXp:            specialSpentXP,
		supernaturalSpentXp:       supernaturalSpentXP,
		previousBasicStats:        previousBasicStats,
		previousSpecialStats:      previousSpecialStats,
		previousSupernaturalStats: previousSupernaturalStats,
		newBasicStats:             newBasicStats,
		newSpecialStats:           newSpecialStats,
		newSupernaturalStats:      newSupernaturalStats,
		createdAt:                 time.Now(),
		occurredAt:                time.Now(),
	}
}
