import { useState, useEffect, useRef } from "react";
import { payAndRegister } from "@/lib/payment";
import { supabase } from "@/lib/supabase";
import {
  X,
  Cpu,
  Gamepad2,
  Phone,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ScrollText,
  AlertTriangle,
  Upload,
  MessageCircle,
  IndianRupee,
  Loader2,
} from "lucide-react";

type Coordinator = { name: string; phone?: string };

type EventItem = {
  id: string;
  name: string;
  tagline: string;
  category: "Technical" | "Non-Technical";
  fee: string;
  teamSize: string;
  rules: string[];
  coordinators: Coordinator[];
  whatsapp: string;
};

const events: EventItem[] = [
  {
    id: "paper",
    name: "Paper Presentation",
    tagline: "Present your research and ideas",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "1–2 members",
    rules: [
      "Maximum 2 members per team; the paper must be original and technically relevant.",
      "Follow the specified academic/IEEE format.",
      "8 minutes presentation + 2 minutes Q&A.",
      "Plagiarism or copied content may lead to disqualification.",
    ],
    coordinators: [
      { name: "Hari Priya" },
      { name: "Anitha" },
      { name: "Varshitha Raj" },
      { name: "J. Raghavi" },
      { name: "N. Mansoor", phone: "8886700676" },
      { name: "V. Lavanya" },
      { name: "M.R. Nikhil", phone: "7013272289" },
      { name: "Chitra" },
    ],
    whatsapp: "https://chat.whatsapp.com/LWRVQqJRZVdLuRdQnPefPj",
  },
  {
    id: "project",
    name: "Project Expo",
    tagline: "Showcase your working prototypes",
    category: "Technical",
    fee: "₹100 / head",
    teamSize: "3–4 members",
    rules: [
      "Present an original working project/model or a detailed simulation.",
      "Teams must bring the required equipment for the model/project. No equipment or components will be provided by the organizers.",
      "Clearly explain the objective, working, methodology and applications.",
      "Judges' decision will be final and binding.",
    ],
    coordinators: [
      { name: "A. Aswin", phone: "9441107161" },
      { name: "N. Rajani" },
      { name: "P. Sudharshan", phone: "9652245005" },
      { name: "Jaya Shree" },
      { name: "C. Divya" },
      { name: "G. Neeraj Kumar", phone: "9392651621" },
      { name: "Naveen Acharya", phone: "9398064215" },
      { name: "B.S. Rukmini" },
    ],
    whatsapp: "https://chat.whatsapp.com/Em0lS2NEpF32aGaTjcTKIJ",
  },
  {
    id: "codedebug",
    name: "Code Debugging",
    tagline: "Hunt down the bugs against the clock",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "1–2 members",
    rules: [
      "Solve programming problems within the specified time limit.",
      "Solutions must be written during the competition using approved IDEs/editors.",
      "External code, repositories, pre-written solutions and AI assistance are not permitted.",
      "Evaluation focuses on logic, correctness, efficiency and execution.",
    ],
    coordinators: [
      { name: "R. Uma" },
      { name: "V. Sindhu" },
      { name: "Hemanth Kumar", phone: "9618225257" },
      { name: "Bhavani Shankar", phone: "9985708284" },
      { name: "S. Bramhani" },
      { name: "A.R.E. Lakshmi Narayana", phone: "8247749668" },
      { name: "Balaji", phone: "8500619223" },
      { name: "Uma Sri" },
    ],
    whatsapp: "https://chat.whatsapp.com/H1jLQLR68iy4UprRliG01P",
  },
  {
    id: "techquiz",
    name: "Tech Quiz",
    tagline: "Test your technical brilliance",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "Includes preliminary/elimination and main quiz rounds.",
      "Questions cover electronics, communication, digital/analog circuits, signal processing, microprocessors and technology.",
      "No unauthorized devices, reference materials or external assistance.",
      "Quiz master's/judges' decision will be final.",
    ],
    coordinators: [
      { name: "D. Sowmya" },
      { name: "B. Dharshan", phone: "9182862973" },
      { name: "D.S. Amrutha" },
      { name: "A. Venkatesh", phone: "9100309531" },
      { name: "B.C. Ashwini" },
      { name: "Basi Reddy", phone: "9502347515" },
    ],
    whatsapp: "https://chat.whatsapp.com/JNDEXqg3vmCKuJhMwqFMyx",
  },
  {
    id: "logodesign",
    name: "Logo Design",
    tagline: "Design a mark that speaks",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "1–2 members",
    rules: [
      "The logo must be designed from scratch based on the given theme/concept.",
      "AI image generators, downloaded logos, templates and copied designs are not permitted.",
      "Complete and submit the design within the specified time.",
      "Creativity, originality, relevance and visual appeal are evaluated.",
    ],
    coordinators: [
      { name: "S.P. Meghana" },
      { name: "Bhavitha" },
      { name: "Harini" },
      { name: "S. Rekha" },
      { name: "T. Raj Kumar", phone: "9963901941" },
      { name: "Mamatha" },
      { name: "M. Vamsi", phone: "9989438017" },
    ],
    whatsapp: "https://chat.whatsapp.com/HAhhjVkhvMnEBSO8okKRtX",
  },
  {
    id: "ideathon",
    name: "Ideathon",
    tagline: "Pitch ideas that change the game",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "2–3 members",
    rules: [
      "Propose an innovative solution to a real-world problem.",
      "Clearly explain the problem, solution, innovation, feasibility and applications.",
      "Only original ideas should be presented within the specified time.",
      "Evaluation focuses on innovation, practicality, impact and presentation.",
    ],
    coordinators: [
      { name: "T. Mukesh", phone: "8639618010" },
      { name: "N. Uday", phone: "9392591037" },
      { name: "Chinnari" },
      { name: "Aruna" },
      { name: "S. Navya" },
      { name: "M.S. Jotheswaran", phone: "6304045864" },
      { name: "Kowshik Naidu", phone: "9398603417" },
      { name: "Deekshitha" },
    ],
    whatsapp: "https://chat.whatsapp.com/EG9BaYK2KQB2CpVhHNCMxV",
  },
  {
    id: "webdesign",
    name: "Web Design",
    tagline: "Build the web, live",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "1–2 members",
    rules: [
      "Websites must be created within the given time using approved tools/editors.",
      "External repositories, pre-written templates, copied code and unauthorized resources are not allowed.",
      "AI assistance is prohibited as per the event rules.",
      "Creativity, UI/UX, functionality, responsiveness and code quality are evaluated.",
    ],
    coordinators: [
      { name: "K. Lokesh Reddy", phone: "9391595381" },
      { name: "Jai Durga" },
      { name: "Chaithanya Jyothi" },
      { name: "B. Shirisha" },
      { name: "K.H. Nunith Kumar Rao", phone: "9985835599" },
      { name: "Varshitha" },
      { name: "S. Karthik", phone: "9490436037" },
    ],
    whatsapp: "https://chat.whatsapp.com/Gk6wJULGw1LG1yWR7LZe3U",
  },
  {
    id: "electrocharades",
    name: "Electro Charades",
    tagline: "Act it out, electronics edition",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "Act out technical terms or concepts without speaking.",
      "The other team members must identify the term within the given time.",
      "Verbal clues, direct spelling, electronic assistance and unauthorized help are not allowed.",
      "Penalties or disqualification may apply for rule violations.",
    ],
    coordinators: [
      { name: "N.T. Jyosthna" },
      { name: "M. Akshaya" },
      { name: "C.M. Reddy Sowjanya" },
      { name: "Reddy Rani" },
      { name: "H. Vyshnavi" },
      { name: "A. Aravind", phone: "6303383007" },
      { name: "Manyatha" },
      { name: "Dinesh", phone: "9963259030" },
    ],
    whatsapp: "https://chat.whatsapp.com/C8lT707eQ8f1xAAkUTQMqt",
  },
  {
    id: "aivideo",
    name: "AI Video Animation & Generation",
    tagline: "Create with generative AI",
    category: "Technical",
    fee: "₹50 / head",
    teamSize: "1–2 members",
    rules: [
      "Create an AI-generated video/animation based on the given theme or topic.",
      "The video must be original and completed within the specified time and format.",
      "Creativity, storytelling, visual quality, technical execution and effective AI usage are evaluated.",
      "Offensive, inappropriate or copyrighted content misuse is strictly prohibited.",
    ],
    coordinators: [
      { name: "P. Anil Kumar", phone: "7670973554" },
      { name: "Umesh Yadhav", phone: "6281883653" },
      { name: "Sai Harshitha" },
      { name: "C. Revathi" },
      { name: "S.A. Abhishek", phone: "9346168289" },
      { name: "B. Shirisha" },
      { name: "Theertha" },
      { name: "S. Bhanu Prakash", phone: "8977147735" },
    ],
    whatsapp: "https://chat.whatsapp.com/E8M2J1kZkzjCLmOg8zT4Ek",
  },
  {
    id: "freefire",
    name: "Free Fire",
    tagline: "Squad up and claim the Booyah",
    category: "Non-Technical",
    fee: "₹200 / team",
    teamSize: "4 members",
    rules: [
      "Mobile phones only; emulators, tablets and physical triggers are prohibited.",
      "Hacks, cheats, third-party mods and intentional teaming are strictly prohibited.",
      "Players are responsible for their device battery and stable internet connection.",
      "Rule violations may result in immediate disqualification or tournament ban.",
    ],
    coordinators: [
      { name: "Nimith Kumar", phone: "8309201275" },
      { name: "Nayana Sree" },
      { name: "K. Rajesh", phone: "9390501865" },
      { name: "S. Vinodh", phone: "9553490138" },
      { name: "K. Supriya" },
      { name: "Deva Raj", phone: "8919809096" },
      { name: "Pavani" },
      { name: "Mohan Sai", phone: "9010096921" },
    ],
    whatsapp: "https://chat.whatsapp.com/Kjf8koh1wf93SBSB3kIKSv",
  },
  {
    id: "bgmi",
    name: "BGMI",
    tagline: "Battlegrounds showdown",
    category: "Non-Technical",
    fee: "₹200 / team",
    teamSize: "4 members",
    rules: [
      "Mobile phones only; emulators, tablets and physical triggers are prohibited.",
      "Hacks, cheats, third-party mods and intentional teaming are strictly prohibited.",
      "Ensure a fully charged device and stable internet connection.",
      "Rule violations may result in immediate disqualification or tournament ban.",
    ],
    coordinators: [
      { name: "Mohan Babu", phone: "9705102132" },
      { name: "K.S. Charan", phone: "9347630150" },
      { name: "Thulasi Ram", phone: "9391968391" },
      { name: "P. Bindu" },
      { name: "B. Dinesh", phone: "6281668510" },
      { name: "Tahir Basha", phone: "9533148672" },
      { name: "Dhamodhar", phone: "9606349783" },
    ],
    whatsapp: "https://chat.whatsapp.com/EdDDnL5R9UuJRK9D5Nz1bq",
  },
  {
    id: "photography",
    name: "Photography",
    tagline: "Frame the campus story",
    category: "Non-Technical",
    fee: "₹100 / head",
    teamSize: "Individual",
    rules: [
      "Photos must be captured during the symposium within the college campus.",
      "Pre-existing or stock photographs are not allowed.",
      "Basic editing is permitted; heavy manipulation is prohibited.",
      "Originality and creativity are considered for evaluation.",
    ],
    coordinators: [
      { name: "Bhavya" },
      { name: "B. Lavanya" },
      { name: "V. Mohan Reddy", phone: "8309004894" },
      { name: "R. Khaleel", phone: "7995985503" },
      { name: "P. Sanjay Kumar", phone: "7386436900" },
      { name: "R. Spandana" },
      { name: "Bhargavi" },
      { name: "Sravanth", phone: "7981946622" },
    ],
    whatsapp: "https://chat.whatsapp.com/GQpaGQXEpSCDZDLZ8SmIwi",
  },
  {
    id: "treasure",
    name: "Treasure Hunt",
    tagline: "Crack the clues, find the treasure",
    category: "Non-Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "Solve clues and reach the designated locations within the given time.",
      "External help, clue tampering and motorized vehicles are strictly prohibited.",
      "Follow all safety instructions and coordinator guidelines.",
      "Cheating or unfair assistance may result in disqualification.",
    ],
    coordinators: [
      { name: "K. Yaswanth", phone: "7013547235" },
      { name: "M.K. Pradeep", phone: "9550231085" },
      { name: "S. Firdos" },
      { name: "Chandra Sekhar", phone: "9908967465" },
      { name: "M. Balaji", phone: "9866102190" },
      { name: "B. Rakshitha" },
      { name: "Rajashekar", phone: "8341493814" },
      { name: "Soundarya" },
    ],
    whatsapp: "https://chat.whatsapp.com/Dc7NGw2WimP7EzVYUazrdF",
  },
  {
    id: "reels",
    name: "Reels Making",
    tagline: "Shoot, edit and go viral",
    category: "Non-Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "The reel must be created during the event based on the given theme.",
      "Pre-existing videos or stock footage are not permitted.",
      "Follow the specified duration and submission format.",
      "Creativity, storytelling and editing quality are evaluated.",
    ],
    coordinators: [
      { name: "Bhavana" },
      { name: "Himabindu" },
      { name: "Vani" },
      { name: "Eshwar", phone: "8328688141" },
      { name: "K.R. Chiru", phone: "9059031225" },
      { name: "P. Asritha" },
      { name: "Aneesha" },
      { name: "Sandeep", phone: "8639510076" },
    ],
    whatsapp: "https://chat.whatsapp.com/Kah2b8e1t18IVW3dfOEGVo",
  },
  {
    id: "meme",
    name: "Meme Making",
    tagline: "Craft the funniest frame",
    category: "Non-Technical",
    fee: "₹50 / head",
    teamSize: "2–3 members",
    rules: [
      "Memes must be original, creative and based on the given theme.",
      "Offensive, abusive, hateful or inappropriate content is not allowed.",
      "Content targeting individuals, religious groups or political parties is prohibited.",
      "Entries must be completed and submitted within the specified time.",
    ],
    coordinators: [
      { name: "Shyam Sirram", phone: "9391310853" },
      { name: "Vishnu Vardhan", phone: "9177990045" },
      { name: "Risitha Sree" },
      { name: "Poojitha" },
      { name: "M. Sandhya" },
      { name: "R. Mahesh Babu", phone: "7386997671" },
      { name: "Dharani" },
      { name: "Shanvi" },
    ],
    whatsapp: "https://chat.whatsapp.com/GTQ8IHRq6sN15kkniOh4SC",
  },
  {
    id: "cinequiz",
    name: "Cine Quiz",
    tagline: "For the true movie buffs",
    category: "Non-Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "May include audio-visual, buzzer, rapid-fire and other rounds.",
      "Follow the quiz master's instructions and time limits.",
      "Unauthorized devices, reference materials and external assistance are prohibited.",
      "The quiz master's/judges' decision will be final.",
    ],
    coordinators: [
      { name: "Navya" },
      { name: "Shalini" },
      { name: "Nandhini" },
      { name: "Bhargavi" },
      { name: "P. Shiva Shankar", phone: "6305259202" },
      { name: "S. Bhagya Lakshmi" },
      { name: "Tejaswini" },
      { name: "Madhu" },
    ],
    whatsapp: "https://chat.whatsapp.com/CvpaACthmxeBgssNCPaunh",
  },
  {
    id: "actguess",
    name: "Act & Guess",
    tagline: "Mime it, guess it, win it",
    category: "Non-Technical",
    fee: "₹50 / head",
    teamSize: "3–4 members",
    rules: [
      "Follows dumb charades-style rules — one participant acts, others guess.",
      "Speaking, lip-reading, direct pointing and making sounds as clues are prohibited.",
      "Each team must complete its turn within the specified time.",
      "Unfair assistance or rule violations may result in penalties or disqualification.",
    ],
    coordinators: [
      { name: "T. Chandu" },
      { name: "B. Anjali" },
      { name: "R. Vidya" },
      { name: "Adharsha Reddy", phone: "9381141696" },
      { name: "K. Charan", phone: "6305635058" },
      { name: "E.C. Manasa" },
      { name: "Sushmitha" },
      { name: "Surya Kranthi", phone: "9014602740" },
    ],
    whatsapp: "https://chat.whatsapp.com/IWiCG0W0HE91Rw6GCbQLUp",
  },
];

const GENERAL_GUIDELINES: string[] = [
  "All participants must carry their valid college ID card at all times.",
  "Report to your respective venue 15 minutes before the scheduled event.",
  "Registration must be completed before the specified deadline.",
  "The decision of the judges and coordinators will be final and binding.",
  "Any misbehaviour, cheating or violation of campus rules may lead to immediate disqualification.",
  "No accommodation will be provided by the college / organizers.",
  "Further details and updates will be communicated through your respective WhatsApp groups.",
  "Spot registration is available.",
  "Every event has a prize pool.",
];

const UPI_ID = ""; // kept for backwards compat; not used in Razorpay flow

type Member = {
  name: string;
  phone: string;
  email: string;
  /** Raw File for upload; set when the user picks a file */
  idCardFile: File | null;
  /** Object-URL preview so the thumbnail still renders instantly */
  idCard: string;
  idCardName: string;
};

type EventPricing = {
  fee_per_head: number;
  fee_type: string;
  min_members: number;
  max_members: number;
};

function maxMembersOf(teamSize: string) {
  if (/individual/i.test(teamSize)) return 1;
  const nums = teamSize.match(/\d+/g);
  if (!nums) return 1;
  return Math.max(...nums.map(Number));
}

function minMembersOf(teamSize: string) {
  if (/individual/i.test(teamSize)) return 1;
  const nums = teamSize.match(/\d+/g);
  if (!nums) return 1;
  return Math.min(...nums.map(Number));
}

function RegistrationForm({ event }: { event: EventItem }) {
  const maxMembers = maxMembersOf(event.teamSize);
  const minMembers = minMembersOf(event.teamSize);
  const [teamName, setTeamName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [members, setMembers] = useState<Member[]>([
    { name: "", phone: "", email: "", idCardFile: null, idCard: "", idCardName: "" },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [regId, setRegId] = useState("");
  const [limitMsg, setLimitMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Pricing fetched from Supabase
  const [pricing, setPricing] = useState<EventPricing | null>(null);
  // Track object-URLs so we can revoke them on unmount
  const objectUrls = useRef<string[]>([]);

  // Fetch live pricing for this event from Supabase
  useEffect(() => {
    supabase
      .from("events")
      .select("fee_per_head, fee_type, min_members, max_members")
      .eq("name", event.name)
      .eq("is_active", true)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPricing(data as EventPricing);
      });
  }, [event.name]);

  // Live amount calculation
  const totalAmount = (() => {
    if (!pricing) return null;
    const feeType = String(pricing.fee_type ?? "per_head").trim().toLowerCase();
    return feeType === "per_team"
      ? pricing.fee_per_head
      : pricing.fee_per_head * members.length;
  })();

  const effectiveMin = pricing ? Number(pricing.min_members) : minMembers;
  const effectiveMax = pricing ? Number(pricing.max_members) : maxMembers;

  const updateMember = (i: number, key: "name" | "phone" | "email", value: string) => {
    setMembers((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)),
    );
  };

  const addMember = () => {
    if (members.length >= effectiveMax) {
      setLimitMsg(`${effectiveMax} member limit is reached!`);
      return;
    }
    setLimitMsg("");
    setMembers((prev) => [
      ...prev,
      { name: "", phone: "", email: "", idCardFile: null, idCard: "", idCardName: "" },
    ]);
  };

  const uploadIdCardLocal = (i: number, file?: File) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    objectUrls.current.push(previewUrl);
    setMembers((prev) =>
      prev.map((m, idx) =>
        idx === i
          ? { ...m, idCardFile: file, idCard: previewUrl, idCardName: file.name }
          : m,
      ),
    );
  };

  const removeMember = (i: number) => {
    setLimitMsg("");
    setMembers((prev) => prev.filter((_, idx) => idx !== i));
  };


  if (submitted) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <CheckCircle2 className="size-16 text-emerald-500" />
        <h4 className="mt-4 font-display text-2xl font-bold text-[var(--color-ink)]">
          Registration Submitted!
        </h4>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          Your team <strong>{teamName || "—"}</strong> is registered for{" "}
          <strong>{event.name}</strong>. Save your registration number to check
          your status later.
        </p>
        <div className="mt-5 rounded-xl border border-dashed border-[var(--color-electric)]/40 bg-[var(--color-paper)] px-8 py-4">
          <p className="font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Your Registration Number
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-[var(--color-electric)]">
            {regId}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Your registration is confirmed and payment has been processed.
        </p>

        {/* Join the event WhatsApp group */}
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-500/25 bg-emerald-50 p-5">
          <p className="font-display text-sm font-semibold text-emerald-800">
            Important — Join the WhatsApp Group
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            All updates for <strong>{event.name}</strong> will be shared here.
            Join now so you don&apos;t miss any announcement.
          </p>
          <a
            href={event.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-emerald-600"
          >
            <MessageCircle className="size-4" />
            Join WhatsApp Group
          </a>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--color-electric)]/20 bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-electric)] focus:ring-2 focus:ring-[var(--color-electric)]/20";
  const labelClass =
    "mb-1 block font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitError(null);
        setLoading(true);
        await payAndRegister(
          {
            event: event.name,
            teamName,
            college: collegeName,
            members,
          },
          {
            onPaymentStarted: () => {
              setPaymentStarted(true);
            },
            onPaymentCancelled: () => {
              setLoading(false);
              setPaymentStarted(false);
              setSubmitError("Payment was cancelled. You can try again.");
            },
            onSuccess: (regNumber) => {
              objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
              setRegId(regNumber);
              setSubmitted(true);
              setLoading(false);
            },
            onError: (message) => {
              setSubmitError(message);
              setLoading(false);
              setPaymentStarted(false);
            },
          },
        );
      }}
      className="space-y-7"
    >
      {/* Coordinators */}
      <div className="rounded-xl border border-[var(--color-electric)]/15 bg-[var(--color-paper)] p-4">
        <p className={labelClass}>Event Coordinators</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {event.coordinators.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
            >
              <Phone className="size-4 shrink-0 text-[var(--color-flame)]" />
              <span className="font-medium text-[var(--color-ink)]">
                {c.name}
              </span>
              {c.phone && (
                <a
                  href={`tel:${c.phone.replace(/\s/g, "")}`}
                  className="ml-auto font-mono text-xs text-[var(--color-electric)] hover:underline"
                >
                  {c.phone}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team & college */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="teamName">
            Team Name
          </label>
          <input
            id="teamName"
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. Circuit Breakers"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="collegeName">
            College Name
          </label>
          <input
            id="collegeName"
            required
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="e.g. Kuppam Engineering College"
            className={inputClass}
          />
        </div>
      </div>

      {/* Members */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className={labelClass + " mb-0"}>
            Team Members
            <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-slate-400">
              {members.length}/{effectiveMax}
            </span>
          </span>
          <button
            type="button"
            onClick={addMember}
            disabled={members.length >= effectiveMax}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-electric)]/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-[var(--color-electric)] transition-colors hover:bg-[var(--color-electric)]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="size-3.5" /> Add Member
          </button>
        </div>
        {limitMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--color-flame)]/30 bg-[var(--color-flame)]/10 px-3 py-2 text-sm font-medium text-[var(--color-flame)]">
            <AlertTriangle className="size-4 shrink-0" />
            {limitMsg}
          </div>
        )}
        <div className="space-y-3">
          {members.map((m, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--color-electric)]/12 bg-white p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
                  Member {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  disabled={members.length === 1}
                  aria-label="Remove member"
                  className="inline-flex items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:text-[var(--color-flame)] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  required
                  value={m.name}
                  onChange={(e) => updateMember(i, "name", e.target.value)}
                  placeholder="Full name"
                  className={inputClass}
                />
                <input
                  required
                  type="tel"
                  value={m.phone}
                  onChange={(e) => updateMember(i, "phone", e.target.value)}
                  placeholder="Contact number"
                  className={inputClass}
                />
                <input
                  required
                  type="email"
                  value={m.email}
                  onChange={(e) => updateMember(i, "email", e.target.value)}
                  placeholder="Email ID"
                  className={inputClass}
                />
              </div>
              {/* ID card proof upload */}
              <div className="mt-2 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--color-electric)]/40 bg-[var(--color-paper)] px-3 py-2 text-xs font-semibold text-[var(--color-electric)] transition-colors hover:bg-[var(--color-electric)]/10">
                  <Upload className="size-4" />
                  {m.idCard ? "Change ID Card" : "Upload College ID Card"}
                  <input
                    type="file"
                    accept="image/*"
                    required={!m.idCard}
                    onChange={(e) => uploadIdCardLocal(i, e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                {m.idCard ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={m.idCard}
                      alt={`ID card of member ${i + 1}`}
                      className="size-11 rounded-md border border-[var(--color-electric)]/20 object-cover"
                    />
                    <span className="max-w-[9rem] truncate text-xs text-slate-500">
                      {m.idCardName}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">
                    Image proof required
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Amount Summary — replaces QR/UTR section */}
      <div className="rounded-xl border border-[var(--color-electric)]/15 bg-[var(--color-paper)] p-5">
        <p className={labelClass}>Total Payment</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-[var(--color-electric)]/10 p-3">
            <IndianRupee className="size-7 text-[var(--color-electric)]" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {totalAmount !== null ? (
                <>&#8377;{totalAmount}</>  
              ) : (
                <span className="text-xl text-slate-400">Loading…</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {pricing
                ? String(pricing.fee_type ?? "per_head").trim().toLowerCase() === "per_team"
                  ? `Fixed team fee (₹${pricing.fee_per_head})`
                  : `₹${pricing.fee_per_head} × ${members.length} member${members.length !== 1 ? "s" : ""}`
                : "Fetching pricing from database…"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Secure payment via Razorpay. Supports UPI, Cards, Net Banking &amp; Wallets.
        </p>
      </div>

      {submitError && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-flame)]/30 bg-[var(--color-flame)]/10 px-3 py-2 text-sm font-medium text-[var(--color-flame)]">
          <AlertTriangle className="size-4 shrink-0" />
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || totalAmount === null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-electric)] px-7 py-3.5 font-display text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[var(--color-electric-bright)] hover:shadow-[0_10px_30px_rgba(18,87,184,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {paymentStarted ? "Verifying Payment…" : "Opening Payment…"}
          </>
        ) : (
          <>
            <IndianRupee className="size-4" />
            Pay &#8377;{totalAmount ?? "…"} &amp; Register
          </>
        )}
      </button>
    </form>
  );
}

function EventModal({
  event,
  onClose,
}: {
  event: EventItem;
  onClose: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[var(--color-ink)]/70 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-2xl border-b border-[var(--color-electric)]/12 bg-white px-6 py-5">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-flame)]">
              {event.category}
            </span>
            <h3 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              {event.name}
            </h3>
            <p className="text-sm text-slate-500">
              {event.teamSize} · {event.fee}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--color-ink)]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {!accepted ? (
            <>
              <div className="mb-4 flex items-center gap-2">
                <ScrollText className="size-5 text-[var(--color-electric)]" />
                <h4 className="font-display text-lg font-semibold uppercase tracking-wide text-[var(--color-ink)]">
                  Rules &amp; Guidelines
                </h4>
              </div>
              <ol className="space-y-3">
                {event.rules.map((rule, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-electric)]/10 font-display text-xs font-bold text-[var(--color-electric)]">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{rule}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setAccepted(true)}
                  className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-electric)] px-7 py-3 font-display text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[var(--color-electric-bright)]"
                >
                  Accept &amp; Register
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-300 px-7 py-3 font-display text-sm font-semibold uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <RegistrationForm event={event} />
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onClick,
}: {
  event: EventItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start rounded-2xl border border-[var(--color-electric)]/12 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-[var(--color-electric)]/40 hover:shadow-[0_18px_45px_rgba(18,87,184,0.16)]"
    >
      <div className="flex w-full items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--color-ink-soft)]">
          {event.teamSize}
        </span>
        <span className="rounded-full bg-[var(--color-electric)]/10 px-3 py-1 font-display text-xs font-semibold text-[var(--color-electric)]">
          {event.fee}
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl font-bold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-electric)]">
        {event.name}
      </h3>
      <p className="mt-1 text-sm text-slate-500">{event.tagline}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-widest text-[var(--color-electric)]">
        Register
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}

type Filter = "All" | "Technical" | "Non-Technical";

export function Events() {
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [filter, setFilter] = useState<Filter>("All");

  const technical = events.filter((e) => e.category === "Technical");
  const nonTechnical = events.filter((e) => e.category === "Non-Technical");

  const filters: { key: Filter; label: string }[] = [
    { key: "All", label: "All Events" },
    { key: "Technical", label: "Technical" },
    { key: "Non-Technical", label: "Non-Technical" },
  ];

  return (
    <section
      id="events"
      className="relative min-h-screen w-full scroll-mt-40 bg-white py-16"
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <p className="font-mono text-xs uppercase tracking-[0.5em] text-[var(--color-flame)]">
            Compete · Create · Conquer
          </p>
          <h2 className="mt-4 font-display text-4xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Events
          </h2>
          <div className="mt-4 h-1 w-16 rounded-full bg-[var(--color-electric)]" />
          <p className="mt-4 max-w-lg text-sm text-slate-500">
            Pick an event, read the rules, and register your team. Payment is
            via UPI — enter your UTR to complete registration.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-5 py-2 font-display text-sm font-semibold uppercase tracking-widest transition-colors ${
                filter === f.key
                  ? "bg-[var(--color-electric)] text-white"
                  : "border border-[var(--color-electric)]/25 bg-white text-[var(--color-ink-soft)] hover:border-[var(--color-electric)] hover:text-[var(--color-electric)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* General guidelines */}
        <div className="mt-10 rounded-2xl border border-[var(--color-electric)]/15 bg-[var(--color-paper)] p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <ScrollText className="size-5 text-[var(--color-flame)]" />
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-[var(--color-ink)]">
              General Guidelines
            </h3>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {GENERAL_GUIDELINES.map((g) => (
              <li key={g} className="flex items-start gap-2.5 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--color-electric)]" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Technical */}
        {filter !== "Non-Technical" && (
          <div className="mt-12 rounded-3xl border border-[var(--color-electric)]/20 bg-gradient-to-br from-[var(--color-electric)]/[0.06] via-white to-white p-5 shadow-[0_20px_60px_-30px_rgba(18,87,184,0.5)] sm:p-8">
            <div className="mb-7 flex flex-wrap items-center gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-electric)] text-white shadow-lg shadow-[var(--color-electric)]/30">
                <Cpu className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--color-electric)]">
                  Flagship Track
                </span>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-3xl">
                  Technical Events
                </h3>
              </div>
              <span className="ml-auto rounded-full bg-[var(--color-electric)]/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-electric)]">
                {technical.length} Events
              </span>
              <span className="h-px w-full bg-[var(--color-electric)]/15" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {technical.map((e) => (
                <EventCard key={e.id} event={e} onClick={() => setSelected(e)} />
              ))}
            </div>
          </div>
        )}

        {/* Non-Technical */}
        {filter !== "Technical" && (
          <div className="mt-12 rounded-3xl border border-[var(--color-flame)]/20 bg-gradient-to-br from-[var(--color-flame)]/[0.06] via-white to-white p-5 shadow-[0_20px_60px_-30px_rgba(226,59,38,0.5)] sm:p-8">
            <div className="mb-7 flex flex-wrap items-center gap-4">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[var(--color-flame)] text-white shadow-lg shadow-[var(--color-flame)]/30">
                <Gamepad2 className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--color-flame)]">
                  Fun Track
                </span>
                <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[var(--color-ink)] sm:text-3xl">
                  Non-Technical Events
                </h3>
              </div>
              <span className="ml-auto rounded-full bg-[var(--color-flame)]/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-[var(--color-flame)]">
                {nonTechnical.length} Events
              </span>
              <span className="h-px w-full bg-[var(--color-flame)]/20" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {nonTechnical.map((e) => (
                <EventCard key={e.id} event={e} onClick={() => setSelected(e)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

export default Events;
