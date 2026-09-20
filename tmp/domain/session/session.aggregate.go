package session

import (
	"meye-core/internal/domain/event"
	"meye-core/internal/domain/shared"
	"time"
)

type XPAmounts struct {
	basic        uint
	special      uint
	superNatural uint
}

func NewXPAmounts(basic, special, superNatural uint) XPAmounts {
	return XPAmounts{
		basic:        basic,
		special:      special,
		superNatural: superNatural,
	}
}

type XPAssignation struct {
	pjID    string
	amounts XPAmounts
	reason  string
}

func NewXPAssignation(pjID string, basic, special, superNatural uint, reason string) XPAssignation {
	return XPAssignation{
		pjID:    pjID,
		amounts: NewXPAmounts(basic, special, superNatural),
		reason:  reason,
	}
}

type Session struct {
	id               string
	campaignID       string
	summary          string
	createdAt        time.Time
	xpAssignations   []XPAssignation
	uncommitedEvents []event.DomainEvent
}

func NewSession(masterID, campID string, summary string, xpAssignations []XPAssignation, idServ shared.IdentificationService) (*Session, error) {
	s := &Session{
		id:             idServ.GenerateID(),
		campaignID:     campID,
		summary:        summary,
		createdAt:      time.Now(),
		xpAssignations: xpAssignations,
	}

	createdEvent := newSessionCreatedEvent(s)
	s.addUncommitedEvent(createdEvent)

	// Create XPAssignedEvent for each XP assignation
	for _, xpAssignation := range xpAssignations {
		xpAssignedEvent := newXPAssignedEvent(xpAssignation, s.id, s.createdAt)
		s.addUncommitedEvent(xpAssignedEvent)
	}

	return s, nil
}

func CreateSessionWithoutValidation(ID, campaignID, summary string, createdAt time.Time, xpAssignations []XPAssignation) *Session {
	return &Session{
		id:             ID,
		campaignID:     campaignID,
		summary:        summary,
		createdAt:      createdAt,
		xpAssignations: xpAssignations,
	}
}

func (s *Session) addUncommitedEvent(e event.DomainEvent) {
	s.uncommitedEvents = append(s.uncommitedEvents, e)
}

func (s *Session) ID() string                             { return s.id }
func (s *Session) CampaignID() string                     { return s.campaignID }
func (s *Session) Summary() string                        { return s.summary }
func (s *Session) CreatedAt() time.Time                   { return s.createdAt }
func (s *Session) XPAssignations() []XPAssignation        { return s.xpAssignations }
func (s *Session) UncommittedEvents() []event.DomainEvent { return s.uncommitedEvents }

func (xp XPAssignation) PjID() string       { return xp.pjID }
func (xp XPAssignation) Reason() string     { return xp.reason }
func (xp XPAssignation) Amounts() XPAmounts { return xp.amounts }
func (xp XPAssignation) Basic() uint        { return xp.amounts.basic }
func (xp XPAssignation) Special() uint      { return xp.amounts.special }
func (xp XPAssignation) SuperNatural() uint { return xp.amounts.superNatural }

func (xpa XPAmounts) Basic() uint        { return xpa.basic }
func (xpa XPAmounts) Special() uint      { return xpa.special }
func (xpa XPAmounts) SuperNatural() uint { return xpa.superNatural }
