package event

import "time"

type EventType string

// User Events.
const (
	EventTypeUserCreated EventType = "user_created"
)

// Campaign Events.
const (
	EventTypeCampaignCreated EventType = "campaign_created"
	EventTypeUserInvited     EventType = "user_invited"
	EventTypePjAdded         EventType = "pj_added"
)

// Session Events.
const (
	EventTypeSessionCreated EventType = "session_created"
	EventTypeXPAssigned     EventType = "xp_assigned"
)

// PJ Events.
const (
	EventTypeXpConsumed   EventType = "xp_consumed"
	EventTypeStatsUpdated EventType = "stats_updated"
)

type AggregateType string

const (
	AggregateTypeSession  AggregateType = "session"
	AggregateTypeCampaign AggregateType = "campaign"
	AggregateTypePJ       AggregateType = "pj"
	AggregateTypeUser     AggregateType = "user"
)

type DomainEvent interface {
	ID() string
	Type() EventType
	AggregateID() string
	AggregateType() AggregateType
	CreatedAt() time.Time
	OccurredAt() time.Time
	GetSerializedData() map[string]interface{}
}
