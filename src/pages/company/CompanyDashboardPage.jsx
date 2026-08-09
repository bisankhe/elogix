// FILE: src/pages/company/CompanyDashboardPage.jsx
// eLogix HRMS — Company Dashboard with role-based routing
// Each role sees their own dashboard automatically
// eLogix Technologies · www.elogix.com.np
import { useAuth } from '../../context/AuthContext.jsx'

const ROLE_CARDS = {
  super_admin:    { icon:'🏢', color:'#312e81', grad:'linear-gradient(135deg,#1e1b4b,#4338ca)', cards:['all_employees','payroll','leave','attendance','recruitment','performance','reports','settings'] },
  executive:      { icon:'📊', color:'#0c4a6e', grad:'linear-gradient(135deg,#0c4a6e,#0369a1)', cards:['headcount','payroll_cost','attrition','kpi','reports'] },
  hr_manager:     { icon:'👥', color:'#0369a1', grad:'linear-gradient(135deg,#0369a1,#38bdf8)', cards:['employees','leave_approvals','recruitment','attendance','payroll','reports'] },
  payroll_officer:{ icon:'💰', color:'#059669', grad:'linear-gradient(135deg,#064e3b,#059669)', cards:['payroll','ssf','cit','bank_transfer','payslips'] },
  hod:            { icon:'🏛', color:'#7c3aed', grad:'linear-gradient(135deg,#4c1d95,#7c3aed)', cards:['dept_employees','dept_leave','dept_attendance','dept_performance'] },
  department_head:{ icon:'🏛', color:'#7c3aed', grad:'linear-gradient(135deg,#4c1d95,#7c3aed)', cards:['dept_employees','dept_leave','dept_attendance','dept_performance'] },
  employee:       { icon:'👤', color:'#0369a1', grad:'linear-gradient(135deg,#0c4a6e,#0369a1)', cards:['my_attendance','my_leave','my_payslip','my_profile','help'] },
}

const CARD_DATA = {
  all_employees:  { label:'All Employees',   icon:'👥', val:'1,247', sub:'Active staff',      color:'#0369a1' },
  payroll:        { label:'Payroll',          icon:'💰', val:'NPR 4.2M', sub:'This month',     color:'#059669' },
  leave:          { label:'Leave Pending',   icon:'📅', val:'23',       sub:'Awaiting approval',color:'#d97706' },
  attendance:     { label:'Present Today',   icon:'✅', val:'1,189',    sub:'94.5% attendance', color:'#10b981' },
  recruitment:    { label:'Open Positions',  icon:'🎯', val:'14',       sub:'Active vacancies', color:'#7c3aed' },
  performance:    { label:'Reviews Due',     icon:'⭐', val:'8',        sub:'This week',        color:'#d97706' },
  reports:        { label:'Reports',         icon:'📊', val:'42',       sub:'Generated this month',color:'#0891b2' },
  settings:       { label:'System',          icon:'⚙️', val:'All OK',  sub:'System health',    color:'#64748b' },
  headcount:      { label:'Total Headcount', icon:'👥', val:'1,247',    sub:'vs 1,230 last month',color:'#0369a1' },
  payroll_cost:   { label:'Payroll Cost',    icon:'💰', val:'NPR 4.2M', sub:'vs NPR 4.1M last month',color:'#059669' },
  attrition:      { label:'Attrition Rate',  icon:'📉', val:'3.2%',     sub:'YTD',              color:'#dc2626' },
  kpi:            { label:'Avg KPI Score',   icon:'⭐', val:'78%',       sub:'This quarter',    color:'#d97706' },
  dept_employees: { label:'Dept Employees',  icon:'👥', val:'47',        sub:'Your department', color:'#7c3aed' },
  dept_leave:     { label:'Dept Leave',      icon:'📅', val:'3',         sub:'Pending in dept', color:'#d97706' },
  dept_attendance:{ label:'Dept Attendance', icon:'✅', val:'44/47',     sub:'Present today',   color:'#10b981' },
  dept_performance:{ label:'Dept Performance',icon:'⭐',val:'82%',       sub:'Avg this quarter',color:'#0369a1' },
  my_attendance:  { label:'My Attendance',   icon:'✅', val:'98%',        sub:'This month',     color:'#10b981' },
  my_leave:       { label:'Leave Balance',   icon:'📅', val:'12 days',   sub:'Remaining annual',color:'#d97706' },
  my_payslip:     { label:'My Payslip',      icon:'💰', val:'NPR 48,500',sub:'July 2026',       color:'#059669' },
  my_profile:     { label:'My Profile',      icon:'👤', val:'Complete',  sub:'95% filled',      color:'#0369a1' },
  help:           { label:'Help & Support',  icon:'🎫', val:'0 open',    sub:'Your tickets',    color:'#64748b' },
  ssf:            { label:'SSF Filing',      icon:'🏛', val:'Due Aug 25',sub:'Baisakh 2083',    color:'#7c3aed' },
  cit:            { label:'CIT Statement',   icon:'📋', val:'Q1 Ready',  sub:'Ready to file',   color:'#0891b2' },
  bank_transfer:  { label:'Bank Transfer',   icon:'🏦', val:'Pending',   sub:'Awaiting approval',color:'#d97706' },
  payslips:       { label:'Payslips',        icon:'📄', val:'1,247',     sub:'Generated Jul 2026',color:'#059669' },
}

export default function CompanyDashboardPage({ onNavigate }) {
  const { user, company, role, level, deptId, branchId, levelPerms,
          isSuperAdmin, companyName, companyPlan } = useAuth()
  const config = ROLE_CARDS[role] || ROLE_CARDS.employee

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f7ff',padding:0}}>
      {/* Role header */}
      <div style={{background:config.grad,padding:'20px 24px',color:'#fff',marginBottom:20,borderRadius:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
          <div>
            <div style={{fontSize:11,opacity:.7,marginBottom:2}}>
              {config.icon} {levelPerms.label} Dashboard · {companyName}
            </div>
            <div style={{fontSize:22,fontWeight:900}}>
              Good morning, {user?.full_name?.split(' ')[0] || 'User'}! 👋
            </div>
            <div style={{fontSize:11,opacity:.75,marginTop:4}}>
              {new Date().toLocaleDateString('en-NP',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{background:'rgba(255,255,255,.15)',borderRadius:10,padding:'8px 14px',marginBottom:6}}>
              <div style={{fontSize:9,opacity:.75}}>eLogix Plan</div>
              <div style={{fontSize:13,fontWeight:800,color:'#fde68a'}}>{companyPlan?.toUpperCase()}</div>
            </div>
            <div style={{fontSize:9,opacity:.6}}>{company?.slug}.elogix.com.np</div>
          </div>
        </div>

        {/* Authority level indicator */}
        <div style={{display:'flex',gap:6,marginTop:16,flexWrap:'wrap'}}>
          {[
            ['👤 Role', role?.replace(/_/g,' ')?.toUpperCase()],
            ['🎖 Level', `L${level}`],
            ...(deptId?[['🏢 Dept', deptId.slice(0,8)+'...']]:[] ),
            ...(branchId?[['🌍 Branch', branchId.slice(0,8)+'...']]:[] ),
            ['🔐 Scope', levelPerms.scope||'all'],
          ].map(([lb,v])=>(
            <div key={lb} style={{background:'rgba(255,255,255,.12)',borderRadius:8,
              padding:'4px 10px',fontSize:9,color:'rgba(255,255,255,.9)'}}>
              {lb}: <b>{v}</b>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard cards */}
      <div style={{padding:'0 20px 20px',display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:14}}>
        {config.cards.map(cardKey=>{
          const card = CARD_DATA[cardKey]
          if (!card) return null
          return (
            <div key={cardKey}
              onClick={()=>onNavigate?.(cardKey)}
              style={{background:'#fff',borderRadius:14,padding:'18px',
                boxShadow:'0 2px 8px rgba(0,0,0,.06)',cursor:'pointer',
                borderLeft:`4px solid ${card.color}`,transition:'all .15s',
                '&:hover':{transform:'translateY(-2px)'}}}>
              <div style={{fontSize:30,marginBottom:8}}>{card.icon}</div>
              <div style={{fontSize:18,fontWeight:900,color:card.color,marginBottom:3}}>{card.val}</div>
              <div style={{fontSize:12,fontWeight:700,color:'#0f172a',marginBottom:2}}>{card.label}</div>
              <div style={{fontSize:10,color:'#64748b'}}>{card.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Bottom info */}
      <div style={{padding:'0 20px 20px',display:'grid',
        gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>

        {/* Quick actions */}
        <div style={{background:'#fff',borderRadius:14,padding:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:14,color:'#0f172a'}}>⚡ Quick Actions</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(role==='employee'?[
              ['Apply for Leave','📅','leave-request'],
              ['View Payslip','💰','payslip-view'],
              ['Update Profile','👤','my-profile'],
              ['Raise Help Ticket','🎫','help-desk'],
            ]:role==='hr_manager'||role==='super_admin'?[
              ['Add Employee','👥','add-employee'],
              ['Process Payroll','💰','payroll-processing'],
              ['Approve Leave','📅','leave-approval'],
              ['Generate Report','📊','reports'],
            ]:[
              ['View Team','👥','team-view'],
              ['Approve Leave','📅','leave-approval'],
              ['Submit OT','⏰','overtime-log'],
            ]).map(([lb,ic,page])=>(
              <button key={lb} onClick={()=>onNavigate?.(page)}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',
                  borderRadius:9,border:'1px solid #f1f5f9',background:'#f8fafc',
                  cursor:'pointer',textAlign:'left',fontSize:11,fontWeight:600}}>
                <span style={{fontSize:18}}>{ic}</span>{lb}
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{background:'#fff',borderRadius:14,padding:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:14,color:'#0f172a'}}>🕐 Recent Activity</div>
          {[
            {text:'Payroll processed for July 2026',time:'2 hrs ago',icon:'💰',color:'#059669'},
            {text:'Leave approved: Bikash Thapa',time:'4 hrs ago',icon:'✅',color:'#0369a1'},
            {text:'New employee onboarded',time:'Yesterday',icon:'👤',color:'#7c3aed'},
            {text:'OT log submitted for approval',time:'Yesterday',icon:'⏰',color:'#d97706'},
          ].map((a,i)=>(
            <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',
              padding:'8px 0',borderBottom:i<3?'1px solid #f1f5f9':'none'}}>
              <span style={{fontSize:18,lineHeight:1}}>{a.icon}</span>
              <div>
                <div style={{fontSize:11,color:'#0f172a'}}>{a.text}</div>
                <div style={{fontSize:9,color:'#94a3b8'}}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan usage (visible to admin/HR) */}
        {level <= 3 && (
          <div style={{background:'#fff',borderRadius:14,padding:'18px',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:14,color:'#0f172a'}}>📊 eLogix Plan Usage</div>
            {[
              ['Employees','1,247','1,000',76,'#0369a1'],
              ['Storage','42GB','100GB',42,'#059669'],
              ['AI Requests','156','1,000',16,'#7c3aed'],
            ].map(([lb,used,limit,pct,color])=>(
              <div key={lb} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:4}}>
                  <span style={{color:'#374151',fontWeight:600}}>{lb}</span>
                  <span style={{color:'#64748b'}}>{used} / {limit}</span>
                </div>
                <div style={{height:6,background:'#f1f5f9',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:pct>85?'#dc2626':color,
                    borderRadius:3,transition:'width .4s'}}/>
                </div>
              </div>
            ))}
            <a href="/billing" style={{display:'block',marginTop:12,padding:'9px',
              borderRadius:9,background:'linear-gradient(135deg,#0c4a6e,#0369a1)',color:'#fff',
              fontSize:11,fontWeight:700,textAlign:'center',textDecoration:'none'}}>
              Manage Plan → elogix.com.np
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
