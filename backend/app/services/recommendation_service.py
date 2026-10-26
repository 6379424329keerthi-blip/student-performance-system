from typing import List
from backend.app.schemas.prediction import PredictionInput, RecommendationItem

class RecommendationService:
    @staticmethod
    def generate_recommendations(input_data: PredictionInput, pred_result: dict) -> List[RecommendationItem]:
        """
        Synthesize actionable, ethical academic support interventions.
        Interventions focus on support mechanisms rather than student deficits.
        """
        recommendations = []
        at_risk = pred_result["predicted_at_risk"] == 1
        risk_prob = pred_result["risk_probability"]
        pred_grade = pred_result["predicted_grade"]
        
        # 1. Formative assessment intervention (G1 score)
        if input_data.G1 < 10.0:
            recommendations.append(RecommendationItem(
                priority="High",
                category="Academic Remediation",
                title="Targeted Practice & Mid-term Remediation",
                recommendation=f"With a mid-term score of {input_data.G1}/20, the student shows concept fragility in key first-semester topics. Provide supplementary practice modules and assign a subject-matter teaching assistant for targeted review."
            ))
        elif input_data.G1 < 13.0:
            recommendations.append(RecommendationItem(
                priority="Medium",
                category="Skill Reinforcement",
                title="Foundational Concept Reinforcement",
                recommendation=f"The student's mid-term performance ({input_data.G1}/20) is in the borderline zone. Recommend weekly problem-solving workshops to solidify core knowledge before cumulative finals."
            ))
            
        # 2. Study Habits and Time Management
        if input_data.studytime <= 2:
            study_hrs = "< 2 hours" if input_data.studytime == 1 else "2 - 5 hours"
            recommendations.append(RecommendationItem(
                priority="High" if at_risk else "Medium",
                category="Study Strategies",
                title="Structured Study Plan & Time Management Mentoring",
                recommendation=f"Self-reported study volume ({study_hrs}/week) is low for secondary {input_data.course}. Encourage participation in supervised study halls and introduce Pomodoro or distributed practice techniques."
            ))
            
        # 3. Prior Academic Course Retention / Failures
        if input_data.failures >= 1:
            recommendations.append(RecommendationItem(
                priority="High",
                category="Advisory Mentoring",
                title="Academic Counseling & Prerequisite Diagnostic",
                recommendation=f"Student has a history of {input_data.failures} prior course failure(s). Schedule a one-on-one session with the academic counselor to identify lingering prerequisite knowledge gaps and address exam anxiety."
            ))
            
        # 4. Attendance and Absence Review
        if input_data.absences >= 8:
            recommendations.append(RecommendationItem(
                priority="High",
                category="Attendance Support",
                title="Attendance Check-In & Welfare Review",
                recommendation=f"Student has accumulated {input_data.absences} school absences, disrupting cumulative lecture continuity. Conduct a compassionate check-in to identify potential health, transportation, or family constraints."
            ))
        elif input_data.absences >= 4:
            recommendations.append(RecommendationItem(
                priority="Medium",
                category="Engagement",
                title="Attendance Monitoring",
                recommendation=f"Noticeable absences ({input_data.absences} days). Ensure student has access to peer notes and asynchronous class materials for missed modules."
            ))
            
        # 5. Social & Peer Lifestyle Balance
        if input_data.goout >= 4 and input_data.studytime <= 2:
            recommendations.append(RecommendationItem(
                priority="Medium",
                category="Lifestyle Balance",
                title="Peer Study Group Integration",
                recommendation="Channel high peer socialization into collaborative peer-study groups, turning social energy into productive revision sessions."
            ))
            
        # 6. School Extra Support Utilization
        if input_data.schoolsup == "no" and at_risk:
            recommendations.append(RecommendationItem(
                priority="High",
                category="Institutional Support",
                title="Enrollment in School Remedial Support",
                recommendation=f"The student is not currently enrolled in school remedial support (`schoolsup=no`). Fast-track enrollment in free school-provided {input_data.course} tutoring."
            ))
            
        # 7. Model Confidence Advisory (When risk probability is borderline)
        if 0.40 <= risk_prob <= 0.60:
            recommendations.append(RecommendationItem(
                priority="Informational",
                category="Pedagogical Monitoring",
                title="Diagnostic Ambiguity: Secondary Assessment Required",
                recommendation=f"Model risk likelihood ({risk_prob:.1%}) sits close to the decision boundary. Do not make definitive judgments; monitor performance on upcoming quizzes and homework assignments before finalizing interventions."
            ))
            
        # Fallback if no specific flags
        if not recommendations:
            recommendations.append(RecommendationItem(
                priority="Informational",
                category="Positive Reinforcement",
                title="Maintain Consistent Study Routines",
                recommendation=f"Student metrics indicate satisfactory progress (projected grade: {pred_grade}/20). Encourage sustained engagement and offer advanced enrichment exercises."
            ))
            
        return recommendations

recommendation_service = RecommendationService()
