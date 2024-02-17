import { Context, Schema, Session } from 'koishi'

declare module 'koishi' {
  interface User {
    'thpt/bind': string
  }
}

export const name = 'thpt'
export const inject = ['database']

type Source = 'mix' | 'nodocchi' | 'local'

export interface Config {
  server: string
  defaultSource: Source
}

export const Config: Schema<Config> = Schema.object({
  server: Schema.string().default('http://localhost:7235'),
  defaultSource: Schema.union<Source>(['mix', 'nodocchi', 'local']).default('mix'),
})

const TREND_VALID_TIME = 60 * 60 * 24 * 30

function generateReply(session: Session, ranks: any) {
  let msg = ranks.description
  const curtime = Date.now() / 1000
  if (ranks.h4.level >= 16 || ranks.h3.level >= 16) msg += `\n${session.text('.highest-level')} ` + ranks.hdescription

  let trend4 = '', trend3 = ''
  if (ranks['4'].time_last > curtime - TREND_VALID_TIME && ranks['4'].trend?.length > 10) trend4 = ranks['4'].trend.slice(-10)
  if (ranks['3'].time_last > curtime - TREND_VALID_TIME && ranks['3'].trend?.length > 10) trend3 = ranks['3'].trend.slice(-10)
  if (trend4 || trend3) msg += `\n${session.text('.recent-results')} [${trend4}][${trend3}]`

  if (ranks.h4.level >= 16) msg += `\n${session.text('.phoenix-time-4')}: ` + new Date(1000 * ranks['4'].time_phoenix).toLocaleDateString()
  if (ranks.h4.level >= 17) msg += `\n${session.text('.highest-time-4')}: ` + new Date(1000 * ranks['h4'].time).toLocaleDateString()
  if (ranks.h3.level >= 16) msg += `\n${session.text('.phoenix-time-3')}: ` + new Date(1000 * ranks['3'].time_phoenix).toLocaleDateString()
  if (ranks.h3.level >= 17) msg += `\n${session.text('.highest-time-3')}: ` + new Date(1000 * ranks['h3'].time).toLocaleDateString()
  return msg
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

  ctx.model.extend('user', {
    'thpt/bind': 'string',
  })

  ctx.command('thpt [username:rawtext]')
    .option('source', '-s <source>', { fallback: config.defaultSource })
    .option('source', '-n', { value: 'nodocchi', descPath: 'commands.thpt.options.source-nodocchi' })
    .option('bind', '-b')
    .userFields(['thpt/bind'])
    .action(async ({ session, options }, username) => {
      if (options.bind) session.user['thpt/bind'] = username ?? ''
      username ||= session.user['thpt/bind']
      if (!username) return options.bind ? '' : session.execute('thpt -h')
      const res = await ctx.http.get(`${config.server}/rank`, {
        params: {
          username,
          source: options.source,
        },
      }).catch(_ => null)
      return res ? generateReply(session, res) : session.text('.failed')
    })
}
