package campaign

import "errors"

var (
	ErrUserNotInvited                = errors.New("ERR_USER_NOT_INVITED")
	ErrPjNotFound                    = errors.New("ERR_PJ_NOT_FOUND")
	ErrPJsNotInCampaign              = errors.New("ERR_PJS_NOT_IN_CAMPAIGN")
	ErrCannotReduceStats             = errors.New("ERR_CANNOT_REDUCE_STATS")
	ErrInsufficientXP                = errors.New("ERR_INSUFFICIENT_XP")
	ErrSupernaturalStatsRequired     = errors.New("ERR_SUPERNATURAL_STATS_REQUIRED")
	ErrCannotUpdateSupernaturalStats = errors.New("ERR_CANNOT_UPDATE_SUPERNATURAL_STATS")
)
