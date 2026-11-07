-- STAGING CANDIDATE ONLY: transactional worker operations.
-- Not applied. Execute only from a trusted, separately authenticated worker service
-- with an isolated database role and server-validated tenant identity.
-- Do not expose these statements as a client RPC.
--
-- Atomic claim: begin transaction; bind $1 tenant uuid, $2 worker id text,
-- $3 lease duration interval. A separate trusted layer must validate all inputs.
begin;
with candidate as (
 select id from public.ralph_build_tasks
 where tenant_id = $1
   and attempts < max_attempts
   and (state = 'queued' or (state = 'leased' and lease_until <= now()))
   and not exists (
      select 1 from public.ralph_build_task_dependencies d
      left join public.ralph_build_tasks prerequisite on prerequisite.id=d.depends_on_task_id
      where d.task_id=ralph_build_tasks.id
        and (prerequisite.id is null or prerequisite.tenant_id<>$1 or prerequisite.state<>'completed')
   )
 order by priority asc, created_at asc, id asc
 for update skip locked
 limit 1
), claimed as (
 update public.ralph_build_tasks t
 set state='leased',attempts=t.attempts+1,lease_token=t.lease_token+1,
     lease_owner=$2,lease_until=now()+$3::interval,updated_at=now()
 from candidate c where t.id=c.id
 returning t.*
), logged as (
 insert into public.ralph_build_task_events(task_id,tenant_id,event_type,lease_token,metadata)
 select id,tenant_id,'claimed',lease_token,jsonb_build_object('worker_id',$2) from claimed
 returning task_id
)
select c.* from claimed c join logged l on l.task_id=c.id;
commit;

-- Atomic completion: separate transaction with $1 task uuid, $2 tenant uuid,
-- $3 worker id, $4 lease token, $5 status ('completed','failed','blocked').
-- The application must treat zero returned rows as a failed/stale lease.
begin;
with finished as (
 update public.ralph_build_tasks t
 set state=$5,lease_owner=null,lease_until=null,updated_at=now()
 where t.id=$1 and t.tenant_id=$2 and t.lease_owner=$3
   and t.lease_token=$4 and t.state='leased' and t.lease_until>now()
   and $5 in ('completed','failed','blocked')
 returning t.*
), logged as (
 insert into public.ralph_build_task_events(task_id,tenant_id,event_type,lease_token,metadata)
 select id,tenant_id,'finished',lease_token,jsonb_build_object('state',state) from finished
 returning task_id
)
select f.* from finished f join logged l on l.task_id=f.id;
commit;
